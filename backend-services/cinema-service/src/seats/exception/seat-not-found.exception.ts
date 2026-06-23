import { NotFoundException } from '@nestjs/common';

/**
 * Thrown when one or more requested seat IDs do not exist. Maps to HTTP 404 with
 * the message documented in API-CONTRACT.md for POST /api/v1/reservations.
 */
export class SeatNotFoundException extends NotFoundException {
    constructor() {
        super('One or more seat IDs not found');
    }
}
