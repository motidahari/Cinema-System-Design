import { Injectable } from '@nestjs/common';
import { Logger } from '@cinema/shared';
import { AppConfig } from '../../infrastructure/config/app.config';
import { TransactionManager } from '@cinema/internal-sdk';
import { SeatDao } from '../../seats/dao/seat.dao';
import { SeatStatus } from '../../seats/enum/seat-status.enum';
import { SeatNotFoundException } from '../../seats/exception/seat-not-found.exception';
import { ReservationDao } from '../dao/reservation.dao';
import { ReservationSeatDao } from '../dao/reservation-seat.dao';
import { ReservationModel } from '../domain-model/reservation';
import { ReservationStatus } from '../enum/reservation-status.enum';
import { SeatSelectionValidator } from '../validation/seat-selection.validator';
import { ActiveReservationExistsException } from '../exception/active-reservation-exists.exception';
import { ReservationNotFoundException } from '../exception/reservation-not-found.exception';
import { ReservationNotOwnedException } from '../exception/reservation-not-owned.exception';
import { SeatsUnavailableException } from '../exception/seats-unavailable.exception';

const UNIQUE_VIOLATION = '23505';

/** True when `err` is a Postgres unique-violation on the named constraint/index. */
function isUniqueViolation(err: unknown, constraint: string): boolean {
    const e = err as { code?: string; constraint?: string; driverError?: { code?: string; constraint?: string } };
    const code = e.code ?? e.driverError?.code;
    const name = e.constraint ?? e.driverError?.constraint;
    return code === UNIQUE_VIOLATION && name === constraint;
}

@Injectable()
export class ReservationsService {
    constructor(
        private readonly reservationDao: ReservationDao,
        private readonly reservationSeatDao: ReservationSeatDao,
        private readonly seatDao: SeatDao,
        private readonly appConfig: AppConfig,
        private readonly transactionManager: TransactionManager
    ) {}

    /**
     * Atomically reserves the given seats for the user. A blocking SELECT FOR UPDATE
     * (ADR-6) prevents concurrent double-booking; both seat-selection rules are
     * validated against the locked snapshot before persisting.
     */
    async reserve(userId: string, seatIds: string[]): Promise<ReservationModel> {
        if (seatIds.length === 0) {
            throw new SeatsUnavailableException('No seat IDs provided');
        }

        Logger.info('Reservation attempt', { userId, seatCount: seatIds.length });

        try {
            const reservation = await this.transactionManager.runInTransaction(async (qr) => {
                // 0. One active PENDING reservation per user (ADR-2), checked in-transaction.
                const activePending = await this.reservationDao.findActivePendingByUser(qr, userId);
                if (activePending) {
                    throw new ActiveReservationExistsException(activePending.id);
                }

                // 1. Blocking row-level locks on the requested seats (ADR-6).
                const lockedSeats = await this.seatDao.lockForUpdate(qr, seatIds);
                if (lockedSeats.length !== seatIds.length) {
                    throw new SeatNotFoundException();
                }

                // 2. All seats must currently be AVAILABLE.
                const unavailable = lockedSeats.filter((s) => !s.isAvailable());
                if (unavailable.length > 0) {
                    throw new SeatsUnavailableException(
                        `Seats ${unavailable.map((s) => `${s.row}${s.number}`).join(', ')} are not available`
                    );
                }

                // 3. Rule 1 — consecutive seats in a single row.
                SeatSelectionValidator.validateConsecutive(lockedSeats);

                // 4. Rule 2 — no isolated seat (boundary-only, ADR-3), evaluated against the row.
                const allRowSeats = await this.seatDao.findByRow(qr, lockedSeats[0].row);
                SeatSelectionValidator.validateNoIsolatedSeat(allRowSeats, new Set(seatIds));

                // 5. Flip the seats to RESERVED.
                await this.seatDao.updateStatusBatch(qr, seatIds, SeatStatus.RESERVED);

                // 6. Persist the reservation + its join rows. If a concurrent path bypassed the
                //    lock, the partial unique index raises a unique violation here (ADR-9).
                const expiresAt = new Date(Date.now() + this.appConfig.reservationHoldMins * 60 * 1000);
                return this.reservationDao.createWithSeats(qr, userId, seatIds, expiresAt);
            });

            Logger.info('Reservation created', { reservationId: reservation.id, userId });
            // NOTE: realtime seat:reserved broadcast is wired in B20 (feat/cinema-realtime).
            return reservation;
        } catch (err) {
            // Map the DB anti-double-booking backstop (ADR-9) to the same 409 as the app check.
            if (isUniqueViolation(err, 'UQ_reservation_seats_active_seat')) {
                throw new SeatsUnavailableException('One or more seats are no longer available');
            }
            throw err;
        }
    }

    /** Confirms a PENDING reservation, transitioning its seats to BOOKED. */
    async confirm(reservationId: string, userId: string): Promise<ReservationModel> {
        const reservation = await this.reservationDao.findById(reservationId);
        if (!reservation) throw new ReservationNotFoundException(reservationId);
        if (!reservation.isOwnedBy(userId)) throw new ReservationNotOwnedException(reservationId);
        if (!reservation.isPending()) {
            throw new SeatsUnavailableException(`Reservation ${reservationId} is not in PENDING state`);
        }
        if (reservation.isExpired()) {
            throw new SeatsUnavailableException(`Reservation ${reservationId} has expired`);
        }

        await this.transactionManager.runInTransaction(async (qr) => {
            await this.reservationDao.updateStatus(qr, reservationId, ReservationStatus.CONFIRMED);
            await this.seatDao.updateStatusBatch(qr, reservation.seatIds, SeatStatus.BOOKED);
        });

        Logger.info('Reservation confirmed', { reservationId, userId });
        // NOTE: realtime seat:booked broadcast is wired in B20 (feat/cinema-realtime).

        // Re-fetch so we return a real ReservationModel instance (its seats stay held).
        const updated = await this.reservationDao.findById(reservationId);
        return updated!;
    }

    /** Cancels a PENDING reservation, releasing its seats back to AVAILABLE. */
    async cancel(reservationId: string, userId: string): Promise<void> {
        const reservation = await this.reservationDao.findById(reservationId);
        if (!reservation) throw new ReservationNotFoundException(reservationId);
        if (!reservation.isOwnedBy(userId)) throw new ReservationNotOwnedException(reservationId);
        if (!reservation.isPending()) {
            throw new SeatsUnavailableException(`Cannot cancel a ${reservation.status} reservation`);
        }

        await this.transactionManager.runInTransaction(async (qr) => {
            await this.reservationDao.updateStatus(qr, reservationId, ReservationStatus.CANCELLED);
            await this.seatDao.updateStatusBatch(qr, reservation.seatIds, SeatStatus.AVAILABLE);
            await this.reservationSeatDao.deactivateByReservation(qr, reservationId); // release DB holder slot (ADR-9)
        });

        Logger.info('Reservation cancelled', { reservationId, userId });
        // NOTE: realtime seat:released broadcast is wired in B20 (feat/cinema-realtime).
    }

    /** The authenticated user's active (PENDING) reservations, newest first. */
    async getMyReservations(userId: string): Promise<ReservationModel[]> {
        return this.reservationDao.findPendingByUser(userId);
    }
}
