import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReservationDao } from '../../src/reservations/dao/reservation.dao';
import { ReservationEntity } from '../../src/domain/entities/reservation.entity';
import { ReservationStatus } from '../../src/reservations/enum/reservation-status.enum';
import { ReservationModel } from '../../src/reservations/domain-model/reservation';
import { randomUUID } from 'crypto';
import { cinemaTestDataSourceOptions, clearCinemaTables, seedSeats, inTransaction } from './helpers/db.helper';

describe('ReservationDao (integration)', () => {
    let module: TestingModule;
    let dao: ReservationDao;
    let dataSource: DataSource;
    let seatIds: string[];

    const USER = randomUUID();
    const future = () => new Date(Date.now() + 15 * 60 * 1000);

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot(cinemaTestDataSourceOptions()),
                TypeOrmModule.forFeature([ReservationEntity]),
            ],
            providers: [ReservationDao],
        }).compile();

        dao = module.get(ReservationDao);
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

    const create = (user = USER, ids = seatIds, expiresAt = future()): Promise<ReservationModel> =>
        inTransaction(dataSource, (qr) => dao.createWithSeats(qr, user, ids, expiresAt));

    describe('createWithSeats, Given:Valid seats, When:Creating', () => {
        it('should persist a PENDING reservation with its seat ids', async () => {
            const reservation = await create();

            expect(reservation.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(reservation.status).toBe(ReservationStatus.PENDING);
            expect(reservation.userId).toBe(USER);
            expect(reservation.seatIds.sort()).toEqual([...seatIds].sort());
        });
    });

    describe('findById, Given:An existing reservation, When:Looking up', () => {
        it('should return it with seat ids populated', async () => {
            const created = await create();
            const found = await dao.findById(created.id);
            expect(found).not.toBeNull();
            expect(found!.seatIds.sort()).toEqual([...seatIds].sort());
        });

        it('should return null for an unknown id', async () => {
            expect(await dao.findById(randomUUID())).toBeNull();
        });
    });

    describe('findActivePendingByUser, Given:Various reservation states, When:Looking up', () => {
        it('should return the active non-expired PENDING reservation', async () => {
            const created = await create();
            const found = await inTransaction(dataSource, (qr) => dao.findActivePendingByUser(qr, USER));
            expect(found?.id).toBe(created.id);
        });

        it('should return null when the only reservation has expired', async () => {
            await create(USER, seatIds, new Date(Date.now() - 1000));
            const found = await inTransaction(dataSource, (qr) => dao.findActivePendingByUser(qr, USER));
            expect(found).toBeNull();
        });

        it('should return null for a user with no reservation', async () => {
            const found = await inTransaction(dataSource, (qr) => dao.findActivePendingByUser(qr, randomUUID()));
            expect(found).toBeNull();
        });
    });

    describe('findPendingByUser, Given:A user with a PENDING reservation, When:Looking up', () => {
        it('should return only their PENDING reservations', async () => {
            const created = await create();
            const list = await dao.findPendingByUser(USER);
            expect(list).toHaveLength(1);
            expect(list[0].id).toBe(created.id);
        });

        it('should not return CANCELLED reservations', async () => {
            const created = await create();
            await inTransaction(dataSource, (qr) => dao.updateStatus(qr, created.id, ReservationStatus.CANCELLED));
            expect(await dao.findPendingByUser(USER)).toHaveLength(0);
        });
    });

    describe('updateStatus, Given:An existing reservation, When:Updating its status', () => {
        it('should persist the new status', async () => {
            const created = await create();
            await inTransaction(dataSource, (qr) => dao.updateStatus(qr, created.id, ReservationStatus.CONFIRMED));
            const found = await dao.findById(created.id);
            expect(found!.status).toBe(ReservationStatus.CONFIRMED);
        });
    });
});
