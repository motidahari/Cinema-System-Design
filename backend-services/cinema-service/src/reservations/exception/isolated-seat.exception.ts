import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when a seat selection violates Rule 2 — it would leave a single empty seat
 * trapped between occupied seats. Maps to HTTP 400 — e.g.
 * `Seat A3 would be isolated after selection`.
 */
export class IsolatedSeatException extends BadRequestException {
    constructor(message: string) {
        super(message);
    }
}
