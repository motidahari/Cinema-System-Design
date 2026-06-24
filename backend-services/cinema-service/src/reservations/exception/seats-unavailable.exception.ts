import { ConflictException } from '@nestjs/common';

/**
 * Thrown when one or more requested seats are not AVAILABLE (already RESERVED or
 * BOOKED). Maps to HTTP 409 — e.g. `Seats A1, A2 are not available`.
 */
export class SeatsUnavailableException extends ConflictException {
    constructor(message: string) {
        super(message);
    }
}
