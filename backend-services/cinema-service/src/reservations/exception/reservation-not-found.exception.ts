import { NotFoundException } from '@nestjs/common';

/**
 * Thrown when a reservation lookup by id finds nothing. Maps to HTTP 404 —
 * e.g. `Reservation d4e5f6a7 not found`.
 */
export class ReservationNotFoundException extends NotFoundException {
    constructor(reservationId: string) {
        super(`Reservation ${reservationId} not found`);
    }
}
