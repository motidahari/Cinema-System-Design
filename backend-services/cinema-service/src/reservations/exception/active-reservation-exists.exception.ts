import { ConflictException } from '@nestjs/common';

/**
 * Thrown when a user already holds an active (PENDING) reservation and tries to make
 * another — enforces the one-active-reservation-per-user rule (ADR-2). Maps to
 * HTTP 409.
 */
export class ActiveReservationExistsException extends ConflictException {
    constructor(reservationId: string) {
        super(
            `You already have an active reservation (${reservationId}). ` +
                `Confirm or cancel it before reserving again.`
        );
    }
}
