import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { ReservationDao } from '../../src/reservations/dao/reservation.dao';
import { ReservationSeatDao } from '../../src/reservations/dao/reservation-seat.dao';
import { ReservationEntity } from '../../src/domain/entities/reservation.entity';
import { ReservationSeatEntity } from '../../src/domain/entities/reservation-seat.entity';
import { cinemaTestDataSourceOptions, clearCinemaTables, seedSeats, inTransaction } from './helpers/db.helper';

describe('ReservationSeatDao (integration)', () => {
    let module: TestingModule;
    let reservationDao: ReservationDao;
    let dao: ReservationSeatDao;
    let dataSource: DataSource;
    let seatIds: string[];

    const USER = randomUUID();

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot(cinemaTestDataSourceOptions()),
                TypeOrmModule.forFeature([ReservationEntity, ReservationSeatEntity]),
            ],
            providers: [ReservationDao, ReservationSeatDao],
        }).compile();

        reservationDao = module.get(ReservationDao);
        dao = module.get(ReservationSeatDao);
        dataSource = module.get(DataSource);
    });

    beforeEach(async () => {
        await clearCinemaTables(dataSource);
        const ids = await seedSeats(dataSource, [
            { row: 'A', number: 1 },
            { row: 'A', number: 2 },
        ]);
        seatIds = [ids.get('A1')!, ids.get('A2')!];
    });

    afterAll(async () => {
        await clearCinemaTables(dataSource);
        await module.close();
    });

    const createReservation = (): Promise<string> =>
        inTransaction(dataSource, async (qr) => {
            const r = await reservationDao.createWithSeats(qr, USER, seatIds, new Date(Date.now() + 15 * 60 * 1000));
            return r.id;
        });

    describe('findSeatIdsByReservation, Given:A reservation with seats, When:Looking up', () => {
        it('should return its seat ids', async () => {
            const reservationId = await createReservation();
            const found = await dao.findSeatIdsByReservation(reservationId);
            expect(found.sort()).toEqual([...seatIds].sort());
        });

        it('should return an empty array for an unknown reservation', async () => {
            expect(await dao.findSeatIdsByReservation(randomUUID())).toEqual([]);
        });
    });

    describe('deactivateByReservation, Given:An active reservation, When:Releasing its seats', () => {
        it('should set is_active = false for all of its join rows', async () => {
            const reservationId = await createReservation();

            await inTransaction(dataSource, (qr) => dao.deactivateByReservation(qr, reservationId));

            const rows = await dataSource.getRepository(ReservationSeatEntity).find({ where: { reservationId } });
            expect(rows).toHaveLength(2);
            expect(rows.every((r) => r.isActive === false)).toBe(true);
        });

        it('should free the seat so a second active reservation can hold it (partial unique index)', async () => {
            const first = await createReservation();
            await inTransaction(dataSource, (qr) => dao.deactivateByReservation(qr, first));

            // With the first holder released, inserting a new active holder for the same seats must succeed.
            await expect(
                inTransaction(dataSource, (qr) =>
                    reservationDao.createWithSeats(qr, USER, seatIds, new Date(Date.now() + 15 * 60 * 1000))
                )
            ).resolves.toBeDefined();
        });
    });

    describe('deactivateByReservation, Given:Two active holders for one seat, When:Inserting', () => {
        it('should be rejected by the partial unique index (anti-double-booking, ADR-9)', async () => {
            await createReservation(); // active holder for A1, A2

            // A second ACTIVE reservation for the same seats violates UQ_reservation_seats_active_seat.
            await expect(
                inTransaction(dataSource, (qr) =>
                    reservationDao.createWithSeats(qr, randomUUID(), seatIds, new Date(Date.now() + 15 * 60 * 1000))
                )
            ).rejects.toThrow();
        });
    });
});
