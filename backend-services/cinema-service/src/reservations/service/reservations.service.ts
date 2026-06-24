import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { Logger } from '@cinema/shared';
import { AppConfig } from '../../infrastructure/config/app.config';
import { TransactionManager } from '@cinema/internal-sdk';
import { SeatDao } from '../../seats/dao/seat.dao';
import { SeatStatus } from '../../seats/enum/seat-status.enum';
import { SeatNotFoundException } from '../../seats/exception/seat-not-found.exception';
import { SeatGateway } from '../../gateway/seat.gateway';
import { ReservationDao } from '../dao/reservation.dao';
import { ReservationSeatDao } from '../dao/reservation-seat.dao';
import { ReservationModel } from '../domain-model/reservation';
import { ReservationStatus } from '../enum/reservation-status.enum';
import { SeatSelectionValidator } from '../validation/seat-selection.validator';
import { ActiveReservationExistsException } from '../exception/active-reservation-exists.exception';
import { ReservationNotFoundException } from '../exception/reservation-not-found.exception';
import { ReservationNotOwnedException } from '../exception/reservation-not-owned.exception';
import { SeatsUnavailableException } from '../exception/seats-unavailable.exception';

/** True when `err` is a Postgres unique-violation on the named constraint/index. */
function isUniqueViolation(err: unknown, constraint: string): boolean {
    const e = err as { code?: string; constraint?: string; driverError?: { code?: string; constraint?: string } };
    const code = e.code ?? e.driverError?.code;
    const name = e.constraint ?? e.driverError?.constraint;

    const uniqueViolationErrorCode = '23505';
    return code === uniqueViolationErrorCode && name === constraint;
}

@Injectable()
export class ReservationsService {
    constructor(
        private readonly reservationDao: ReservationDao,
        private readonly reservationSeatDao: ReservationSeatDao,
        private readonly seatDao: SeatDao,
        private readonly seatGateway: SeatGateway,
        private readonly appConfig: AppConfig,
        private readonly transactionManager: TransactionManager
    ) {}

    /**
     * Atomically reserves the given seats for the user. A blocking SELECT FOR UPDATE
     * (ADR-6) prevents concurrent double-booking; both seat-selection rules are
     * validated against the locked snapshot before persisting.
     */
    async reserve(userId: string, seatIds: string[]): Promise<ReservationModel> {
        if (seatIds.length === 0) throw new SeatsUnavailableException('No seat IDs provided');

        Logger.info('Reservation attempt', { userId, seatCount: seatIds.length });

        try {
            const reservation = await this.transactionManager.runInTransaction(async (queryRunner) => {
                const lockedSeats = await this.validateReserve(queryRunner, userId, seatIds);

                await this.seatDao.updateStatusBatch(queryRunner, seatIds, SeatStatus.RESERVED);

                // If a concurrent path bypassed the lock, the partial unique index raises
                // a unique violation here (ADR-9).
                const expiresAt = new Date(Date.now() + this.appConfig.reservationHoldMins * 60 * 1000);
                const created = await this.reservationDao.createWithSeats(queryRunner, userId, seatIds, expiresAt);
                return { reservation: created, lockedSeats };
            });

            Logger.info('Reservation created', { reservationId: reservation.reservation.id, userId });
            this.seatGateway.emitSeatReserved(reservation.lockedSeats);
            return reservation.reservation;
        } catch (err) {
            // Map the DB anti-double-booking backstop (ADR-9) to the same 409 as the app check.
            if (isUniqueViolation(err, 'UQ_reservation_seats_active_seat')) {
                throw new SeatsUnavailableException('One or more seats are no longer available');
            }
            throw err;
        }
    }

    private async validateReserve(qr: QueryRunner, userId: string, seatIds: string[]) {
        const activePending = await this.reservationDao.findActivePendingByUser(qr, userId);
        if (activePending) throw new ActiveReservationExistsException(activePending.id);

        const lockedSeats = await this.seatDao.lockForUpdate(qr, seatIds);
        if (lockedSeats.length !== seatIds.length) throw new SeatNotFoundException();

        const unavailable = lockedSeats.filter((s) => !s.isAvailable());
        if (unavailable.length > 0)
            throw new SeatsUnavailableException(
                `Seats ${unavailable.map((s) => `${s.row}${s.number}`).join(', ')} are not available`
            );

        SeatSelectionValidator.validateConsecutive(lockedSeats);

        const allRowSeats = await this.seatDao.findByRow(qr, lockedSeats[0].row);
        SeatSelectionValidator.validateNoIsolatedSeat(allRowSeats, new Set(seatIds));

        return lockedSeats;
    }

    /** Confirms a PENDING reservation, transitioning its seats to BOOKED. */
    async confirm(reservationId: string, userId: string): Promise<ReservationModel> {
        const reservation = await this.validateConfirm(reservationId, userId);

        await this.transactionManager.runInTransaction(async (queryRunner) => {
            await this.reservationDao.updateStatus(queryRunner, reservationId, ReservationStatus.CONFIRMED);
            await this.seatDao.updateStatusBatch(queryRunner, reservation.seatIds, SeatStatus.BOOKED);
        });

        Logger.info('Reservation confirmed', { reservationId, userId });

        const bookedSeats = await this.seatDao.findByIds(reservation.seatIds);
        this.seatGateway.emitSeatBooked(bookedSeats);

        // Re-fetch so we return a real ReservationModel instance (its seats stay held).
        const updated = await this.reservationDao.findById(reservationId);
        return updated!;
    }

    private async validateConfirm(reservationId: string, userId: string): Promise<ReservationModel> {
        const reservation = await this.reservationDao.findById(reservationId);
        if (!reservation) throw new ReservationNotFoundException(reservationId);
        if (!reservation.isOwnedBy(userId)) throw new ReservationNotOwnedException(reservationId);
        if (!reservation.isPending())
            throw new SeatsUnavailableException(`Reservation ${reservationId} is not in PENDING state`);
        if (reservation.isExpired()) throw new SeatsUnavailableException(`Reservation ${reservationId} has expired`);
        return reservation;
    }

    /** Cancels a PENDING reservation, releasing its seats back to AVAILABLE. */
    async cancel(reservationId: string, userId: string): Promise<void> {
        const reservation = await this.validateCancel(reservationId, userId);

        await this.transactionManager.runInTransaction(async (queryRunner) => {
            await this.reservationDao.updateStatus(queryRunner, reservationId, ReservationStatus.CANCELLED);
            await this.seatDao.updateStatusBatch(queryRunner, reservation.seatIds, SeatStatus.AVAILABLE);
            await this.reservationSeatDao.deactivateByReservation(queryRunner, reservationId); // release DB holder slot (ADR-9)
        });

        Logger.info('Reservation cancelled', { reservationId, userId });

        const releasedSeats = await this.seatDao.findByIds(reservation.seatIds);
        this.seatGateway.emitSeatReleased(releasedSeats);
    }

    private async validateCancel(reservationId: string, userId: string): Promise<ReservationModel> {
        const reservation = await this.reservationDao.findById(reservationId);
        if (!reservation) throw new ReservationNotFoundException(reservationId);
        if (!reservation.isOwnedBy(userId)) throw new ReservationNotOwnedException(reservationId);
        if (!reservation.isPending())
            throw new SeatsUnavailableException(`Cannot cancel a ${reservation.status} reservation`);
        return reservation;
    }

    /** The authenticated user's active (PENDING) reservations, newest first. */
    async getMyReservations(userId: string): Promise<ReservationModel[]> {
        return this.reservationDao.findPendingByUser(userId);
    }
}
