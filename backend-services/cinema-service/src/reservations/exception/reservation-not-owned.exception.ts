import { ForbiddenException } from '@nestjs/common';

/**
 * Thrown when a user attempts to act on a reservation they do not own. Maps to
 * HTTP 403 — e.g. `Reservation d4e5f6a7 does not belong to you`.
 */
export class ReservationNotOwnedException extends ForbiddenException {
    constructor(reservationId: string) {
        super(`Reservation ${reservationId} does not belong to you`);
    }
}
