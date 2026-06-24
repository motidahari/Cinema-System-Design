import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { ReservationExpiryCron } from '../../src/scheduler/reservation-expiry.cron';
import { ReservationDao } from '../../src/reservations/dao/reservation.dao';
import { ReservationSeatDao } from '../../src/reservations/dao/reservation-seat.dao';
import { SeatDao } from '../../src/seats/dao/seat.dao';
import { SeatGateway } from '../../src/gateway/seat.gateway';
import { ReservationModel, ReservationModelAttrs } from '../../src/reservations/domain-model/reservation';
import { ReservationStatus } from '../../src/reservations/enum/reservation-status.enum';
import { SeatModel } from '../../src/seats/domain-model/seat';
import { SeatStatus } from '../../src/seats/enum/seat-status.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeReservation = (overrides: Partial<ReservationModelAttrs> = {}): ReservationModel =>
    new ReservationModel({
        id: randomUUID(),
        userId: randomUUID(),
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() - 60_000),
        seatIds: [randomUUID(), randomUUID()],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

const makeSeat = (id: string): SeatModel =>
    new SeatModel({
        id,
        row: 'A',
        number: 1,
        status: SeatStatus.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

describe('ReservationExpiryCron', () => {
    let cron: ReservationExpiryCron;
    let reservationDao: { findExpiredPending: jest.Mock; updateStatus: jest.Mock };
    let reservationSeatDao: { deactivateByReservation: jest.Mock };
    let seatDao: { updateStatusBatch: jest.Mock; findByIds: jest.Mock };
    let seatGateway: { emitSeatReleased: jest.Mock };
    let lockQr: Partial<QueryRunner>;
    let txQr: Partial<QueryRunner>;
    let dataSource: { createQueryRunner: jest.Mock };

    beforeEach(async () => {
        lockQr = {
            connect: jest.fn().mockResolvedValue(undefined),
            query: jest.fn().mockResolvedValue([{ locked: true }]),
            release: jest.fn().mockResolvedValue(undefined),
        };
        txQr = {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
        };

        let callCount = 0;
        dataSource = {
            createQueryRunner: jest.fn().mockImplementation(() => (callCount++ === 0 ? lockQr : txQr)),
        };

        reservationDao = {
            findExpiredPending: jest.fn().mockResolvedValue([]),
            updateStatus: jest.fn().mockResolvedValue(undefined),
        };
        reservationSeatDao = { deactivateByReservation: jest.fn().mockResolvedValue(undefined) };
        seatDao = {
            updateStatusBatch: jest.fn().mockResolvedValue(undefined),
            findByIds: jest.fn().mockResolvedValue([]),
        };
        seatGateway = { emitSeatReleased: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReservationExpiryCron,
                { provide: ReservationDao, useValue: reservationDao },
                { provide: ReservationSeatDao, useValue: reservationSeatDao },
                { provide: SeatDao, useValue: seatDao },
                { provide: SeatGateway, useValue: seatGateway },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        cron = module.get(ReservationExpiryCron);
    });

    describe('releaseExpired, Given:Another instance holds the advisory lock, When:Tick fires', () => {
        it('should skip processing without querying for expired reservations', async () => {
            (lockQr.query as jest.Mock).mockResolvedValueOnce([{ locked: false }]);

            await cron.releaseExpired();

            expect(reservationDao.findExpiredPending).not.toHaveBeenCalled();
        });

        it('should still release the advisory lock connection', async () => {
            (lockQr.query as jest.Mock).mockResolvedValueOnce([{ locked: false }]);

            await cron.releaseExpired();

            expect(lockQr.release).toHaveBeenCalled();
        });
    });

    describe('releaseExpired, Given:No expired reservations, When:Tick fires', () => {
        it('should acquire the lock, query for expired reservations, and do nothing', async () => {
            reservationDao.findExpiredPending.mockResolvedValue([]);

            await cron.releaseExpired();

            expect(reservationDao.findExpiredPending).toHaveBeenCalledTimes(1);
            expect(reservationDao.updateStatus).not.toHaveBeenCalled();
        });
    });

    describe('releaseExpired, Given:Two expired PENDING reservations, When:Tick fires', () => {
        let r1: ReservationModel;
        let r2: ReservationModel;

        beforeEach(() => {
            r1 = makeReservation();
            r2 = makeReservation();
            reservationDao.findExpiredPending.mockResolvedValue([r1, r2]);
            seatDao.findByIds
                .mockResolvedValueOnce([makeSeat(r1.seatIds[0])])
                .mockResolvedValueOnce([makeSeat(r2.seatIds[0])]);
        });

        it('should mark each reservation as EXPIRED', async () => {
            await cron.releaseExpired();

            expect(reservationDao.updateStatus).toHaveBeenCalledWith(txQr, r1.id, ReservationStatus.EXPIRED);
            expect(reservationDao.updateStatus).toHaveBeenCalledWith(txQr, r2.id, ReservationStatus.EXPIRED);
        });

        it("should release each reservation's seats back to AVAILABLE", async () => {
            await cron.releaseExpired();

            expect(seatDao.updateStatusBatch).toHaveBeenCalledWith(txQr, r1.seatIds, SeatStatus.AVAILABLE);
            expect(seatDao.updateStatusBatch).toHaveBeenCalledWith(txQr, r2.seatIds, SeatStatus.AVAILABLE);
        });

        it('should deactivate reservation_seats rows to release the DB holder slot (ADR-9)', async () => {
            await cron.releaseExpired();

            expect(reservationSeatDao.deactivateByReservation).toHaveBeenCalledWith(txQr, r1.id);
            expect(reservationSeatDao.deactivateByReservation).toHaveBeenCalledWith(txQr, r2.id);
        });

        it('should commit a transaction for each reservation', async () => {
            await cron.releaseExpired();

            expect(txQr.commitTransaction).toHaveBeenCalledTimes(2);
        });

        it('should fetch seats and broadcast seat:released after each expiry', async () => {
            await cron.releaseExpired();
            await Promise.resolve();
            await Promise.resolve();

            expect(seatDao.findByIds).toHaveBeenCalledWith(r1.seatIds);
            expect(seatDao.findByIds).toHaveBeenCalledWith(r2.seatIds);
            expect(seatGateway.emitSeatReleased).toHaveBeenCalledTimes(2);
        });

        it('should unlock and release the advisory lock connection', async () => {
            await cron.releaseExpired();

            expect(lockQr.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [491_001]);
            expect(lockQr.release).toHaveBeenCalled();
        });
    });

    describe('releaseExpired, Given:One reservation fails mid-transaction, When:Tick fires', () => {
        it('should rollback the failed reservation and continue to process the next one', async () => {
            const r1 = makeReservation();
            const r2 = makeReservation();
            reservationDao.findExpiredPending.mockResolvedValue([r1, r2]);
            reservationDao.updateStatus.mockRejectedValueOnce(new Error('DB error')).mockResolvedValue(undefined);

            await cron.releaseExpired();

            expect(txQr.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(txQr.commitTransaction).toHaveBeenCalledTimes(1);
        });

        it('should not propagate the error out of the cron tick', async () => {
            reservationDao.findExpiredPending.mockResolvedValue([makeReservation()]);
            reservationDao.updateStatus.mockRejectedValue(new Error('DB error'));

            await expect(cron.releaseExpired()).resolves.toBeUndefined();
        });
    });

    describe('releaseExpired, Given:A previous tick is still running, When:A new tick fires', () => {
        it('should skip the new tick without acquiring the advisory lock', async () => {
            (lockQr.connect as jest.Mock).mockReturnValueOnce(new Promise(() => {}));

            void cron.releaseExpired();

            await cron.releaseExpired();

            expect(lockQr.connect).toHaveBeenCalledTimes(1);
            expect(reservationDao.findExpiredPending).not.toHaveBeenCalled();
        });
    });
});
