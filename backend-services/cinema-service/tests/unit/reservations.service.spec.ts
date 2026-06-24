import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { QueryRunner } from 'typeorm';
import { ReservationsService } from '../../src/reservations/service/reservations.service';
import { ReservationDao } from '../../src/reservations/dao/reservation.dao';
import { ReservationSeatDao } from '../../src/reservations/dao/reservation-seat.dao';
import { SeatDao } from '../../src/seats/dao/seat.dao';
import { AppConfig } from '../../src/infrastructure/config/app.config';
import { TransactionManager } from '../../src/infrastructure/database/transaction.manager';
import { ReservationModel, ReservationModelAttrs } from '../../src/reservations/domain-model/reservation';
import { ReservationStatus } from '../../src/reservations/enum/reservation-status.enum';
import { SeatModel } from '../../src/seats/domain-model/seat';
import { SeatStatus } from '../../src/seats/enum/seat-status.enum';
import { ActiveReservationExistsException } from '../../src/reservations/exception/active-reservation-exists.exception';
import { ReservationNotFoundException } from '../../src/reservations/exception/reservation-not-found.exception';
import { ReservationNotOwnedException } from '../../src/reservations/exception/reservation-not-owned.exception';
import { SeatsUnavailableException } from '../../src/reservations/exception/seats-unavailable.exception';
import { SeatsNotConsecutiveException } from '../../src/reservations/exception/seats-not-consecutive.exception';
import { IsolatedSeatException } from '../../src/reservations/exception/isolated-seat.exception';
import { SeatNotFoundException } from '../../src/seats/exception/seat-not-found.exception';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeSeat = (id: string, row: string, number: number, status = SeatStatus.AVAILABLE): SeatModel =>
    new SeatModel({ id, row, number, status, createdAt: new Date(), updatedAt: new Date() });

const makeReservation = (overrides: Partial<ReservationModelAttrs> = {}): ReservationModel =>
    new ReservationModel({
        id: randomUUID(),
        userId: randomUUID(),
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        seatIds: [randomUUID()],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });

/** Builds a full available row A1..A10 plus the given selected SeatModels merged in. */
const buildRowWith = (selected: SeatModel[]): SeatModel[] => {
    const byNumber = new Map(selected.map((s) => [s.number, s]));
    return Array.from({ length: 10 }, (_, i) => byNumber.get(i + 1) ?? makeSeat(randomUUID(), 'A', i + 1));
};

describe('ReservationsService', () => {
    let service: ReservationsService;
    let reservationDao: {
        findActivePendingByUser: jest.Mock;
        createWithSeats: jest.Mock;
        findById: jest.Mock;
        findPendingByUser: jest.Mock;
        updateStatus: jest.Mock;
    };
    let reservationSeatDao: { deactivateByReservation: jest.Mock };
    let seatDao: { lockForUpdate: jest.Mock; findByRow: jest.Mock; updateStatusBatch: jest.Mock };
    let transactionManager: { runInTransaction: jest.Mock };

    const USER = randomUUID();

    beforeEach(async () => {
        reservationDao = {
            findActivePendingByUser: jest.fn().mockResolvedValue(null),
            createWithSeats: jest.fn(),
            findById: jest.fn(),
            findPendingByUser: jest.fn(),
            updateStatus: jest.fn().mockResolvedValue(undefined),
        };
        reservationSeatDao = { deactivateByReservation: jest.fn().mockResolvedValue(undefined) };
        seatDao = {
            lockForUpdate: jest.fn(),
            findByRow: jest.fn(),
            updateStatusBatch: jest.fn().mockResolvedValue(undefined),
        };
        // Runs the callback with a dummy QueryRunner; DAOs are mocked so the runner is unused.
        transactionManager = {
            runInTransaction: jest.fn((work: (qr: QueryRunner) => Promise<unknown>) => work({} as QueryRunner)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReservationsService,
                { provide: ReservationDao, useValue: reservationDao },
                { provide: ReservationSeatDao, useValue: reservationSeatDao },
                { provide: SeatDao, useValue: seatDao },
                { provide: AppConfig, useValue: { reservationHoldMins: 15 } },
                { provide: TransactionManager, useValue: transactionManager },
            ],
        }).compile();

        service = module.get(ReservationsService);
    });

    // ── reserve ───────────────────────────────────────────────────────────────
    describe('reserve, Given:An empty seat list, When:Reserving', () => {
        it('should throw SeatsUnavailableException without opening a transaction', async () => {
            await expect(service.reserve(USER, [])).rejects.toThrow(SeatsUnavailableException);
            expect(transactionManager.runInTransaction).not.toHaveBeenCalled();
        });
    });

    describe('reserve, Given:The user already holds an active reservation, When:Reserving', () => {
        it('should throw ActiveReservationExistsException (ADR-2)', async () => {
            reservationDao.findActivePendingByUser.mockResolvedValue(makeReservation({ userId: USER }));
            await expect(service.reserve(USER, [randomUUID()])).rejects.toThrow(ActiveReservationExistsException);
        });
    });

    describe('reserve, Given:A requested seat id does not exist, When:Reserving', () => {
        it('should throw SeatNotFoundException when fewer seats are locked than requested', async () => {
            const ids = [randomUUID(), randomUUID()];
            seatDao.lockForUpdate.mockResolvedValue([makeSeat(ids[0], 'A', 1)]);
            await expect(service.reserve(USER, ids)).rejects.toThrow(SeatNotFoundException);
        });
    });

    describe('reserve, Given:A locked seat is not AVAILABLE, When:Reserving', () => {
        it('should throw SeatsUnavailableException naming the seat', async () => {
            const id = randomUUID();
            seatDao.lockForUpdate.mockResolvedValue([makeSeat(id, 'A', 1, SeatStatus.RESERVED)]);
            await expect(service.reserve(USER, [id])).rejects.toThrow('Seats A1 are not available');
        });
    });

    describe('reserve, Given:Non-consecutive seats, When:Reserving', () => {
        it('should throw SeatsNotConsecutiveException', async () => {
            const ids = [randomUUID(), randomUUID()];
            const seats = [makeSeat(ids[0], 'A', 1), makeSeat(ids[1], 'A', 3)];
            seatDao.lockForUpdate.mockResolvedValue(seats);
            seatDao.findByRow.mockResolvedValue(buildRowWith(seats));
            await expect(service.reserve(USER, ids)).rejects.toThrow(SeatsNotConsecutiveException);
        });
    });

    describe('reserve, Given:A selection that traps a seat, When:Reserving', () => {
        it('should throw IsolatedSeatException', async () => {
            // Row: seat 1 reserved; selecting seats 3,4 traps seat 2 between reserved-1 and selected-3.
            const ids = [randomUUID(), randomUUID()];
            const selected = [makeSeat(ids[0], 'A', 3), makeSeat(ids[1], 'A', 4)];
            seatDao.lockForUpdate.mockResolvedValue(selected);
            const row = buildRowWith([makeSeat(randomUUID(), 'A', 1, SeatStatus.RESERVED), ...selected]);
            seatDao.findByRow.mockResolvedValue(row);
            await expect(service.reserve(USER, ids)).rejects.toThrow(IsolatedSeatException);
        });
    });

    describe('reserve, Given:Valid consecutive available seats, When:Reserving', () => {
        it('should mark seats RESERVED, persist, and return the reservation', async () => {
            const ids = [randomUUID(), randomUUID()];
            const selected = [makeSeat(ids[0], 'A', 1), makeSeat(ids[1], 'A', 2)];
            seatDao.lockForUpdate.mockResolvedValue(selected);
            seatDao.findByRow.mockResolvedValue(buildRowWith(selected));
            const created = makeReservation({ userId: USER, seatIds: ids });
            reservationDao.createWithSeats.mockResolvedValue(created);

            const result = await service.reserve(USER, ids);

            expect(result).toBe(created);
            expect(seatDao.updateStatusBatch).toHaveBeenCalledWith(expect.anything(), ids, SeatStatus.RESERVED);
            expect(reservationDao.createWithSeats).toHaveBeenCalledWith(expect.anything(), USER, ids, expect.any(Date));
        });
    });

    describe('reserve, Given:The DB anti-double-booking index trips, When:Reserving', () => {
        it('should map the unique violation to SeatsUnavailableException (ADR-9)', async () => {
            const ids = [randomUUID()];
            const selected = [makeSeat(ids[0], 'A', 1)];
            seatDao.lockForUpdate.mockResolvedValue(selected);
            seatDao.findByRow.mockResolvedValue(buildRowWith(selected));
            reservationDao.createWithSeats.mockRejectedValue({
                code: '23505',
                constraint: 'UQ_reservation_seats_active_seat',
            });

            await expect(service.reserve(USER, ids)).rejects.toThrow(SeatsUnavailableException);
        });
    });

    // ── confirm ─────────────────────────────────────────────────────────────
    describe('confirm', () => {
        it('Given:Unknown reservation, should throw ReservationNotFoundException', async () => {
            reservationDao.findById.mockResolvedValue(null);
            await expect(service.confirm(randomUUID(), USER)).rejects.toThrow(ReservationNotFoundException);
        });

        it('Given:A reservation owned by someone else, should throw ReservationNotOwnedException', async () => {
            reservationDao.findById.mockResolvedValue(makeReservation({ userId: randomUUID() }));
            await expect(service.confirm(randomUUID(), USER)).rejects.toThrow(ReservationNotOwnedException);
        });

        it('Given:A non-PENDING reservation, should throw SeatsUnavailableException', async () => {
            reservationDao.findById.mockResolvedValue(
                makeReservation({ userId: USER, status: ReservationStatus.CONFIRMED })
            );
            await expect(service.confirm(randomUUID(), USER)).rejects.toThrow('is not in PENDING state');
        });

        it('Given:An expired reservation, should throw SeatsUnavailableException', async () => {
            reservationDao.findById.mockResolvedValue(
                makeReservation({ userId: USER, expiresAt: new Date(Date.now() - 1000) })
            );
            await expect(service.confirm(randomUUID(), USER)).rejects.toThrow('has expired');
        });

        it('Given:A valid PENDING reservation, should book the seats and return the updated reservation', async () => {
            const id = randomUUID();
            const pending = makeReservation({ id, userId: USER, seatIds: [randomUUID(), randomUUID()] });
            const confirmed = makeReservation({
                id,
                userId: USER,
                status: ReservationStatus.CONFIRMED,
                seatIds: pending.seatIds,
            });
            reservationDao.findById.mockResolvedValueOnce(pending).mockResolvedValueOnce(confirmed);

            const result = await service.confirm(id, USER);

            expect(result.status).toBe(ReservationStatus.CONFIRMED);
            expect(reservationDao.updateStatus).toHaveBeenCalledWith(
                expect.anything(),
                id,
                ReservationStatus.CONFIRMED
            );
            expect(seatDao.updateStatusBatch).toHaveBeenCalledWith(
                expect.anything(),
                pending.seatIds,
                SeatStatus.BOOKED
            );
        });
    });

    // ── cancel ──────────────────────────────────────────────────────────────
    describe('cancel', () => {
        it('Given:Unknown reservation, should throw ReservationNotFoundException', async () => {
            reservationDao.findById.mockResolvedValue(null);
            await expect(service.cancel(randomUUID(), USER)).rejects.toThrow(ReservationNotFoundException);
        });

        it('Given:A reservation owned by someone else, should throw ReservationNotOwnedException', async () => {
            reservationDao.findById.mockResolvedValue(makeReservation({ userId: randomUUID() }));
            await expect(service.cancel(randomUUID(), USER)).rejects.toThrow(ReservationNotOwnedException);
        });

        it('Given:A non-PENDING reservation, should throw SeatsUnavailableException', async () => {
            reservationDao.findById.mockResolvedValue(
                makeReservation({ userId: USER, status: ReservationStatus.CONFIRMED })
            );
            await expect(service.cancel(randomUUID(), USER)).rejects.toThrow('Cannot cancel a CONFIRMED reservation');
        });

        it('Given:A valid PENDING reservation, should release seats and deactivate the holder rows', async () => {
            const id = randomUUID();
            const pending = makeReservation({ id, userId: USER, seatIds: [randomUUID()] });
            reservationDao.findById.mockResolvedValue(pending);

            await service.cancel(id, USER);

            expect(reservationDao.updateStatus).toHaveBeenCalledWith(
                expect.anything(),
                id,
                ReservationStatus.CANCELLED
            );
            expect(seatDao.updateStatusBatch).toHaveBeenCalledWith(
                expect.anything(),
                pending.seatIds,
                SeatStatus.AVAILABLE
            );
            expect(reservationSeatDao.deactivateByReservation).toHaveBeenCalledWith(expect.anything(), id);
        });
    });

    // ── getMyReservations ─────────────────────────────────────────────────────
    describe('getMyReservations', () => {
        it('should return the active reservations from the DAO', async () => {
            const list = [makeReservation({ userId: USER })];
            reservationDao.findPendingByUser.mockResolvedValue(list);

            expect(await service.getMyReservations(USER)).toBe(list);
            expect(reservationDao.findPendingByUser).toHaveBeenCalledWith(USER);
        });
    });
});
