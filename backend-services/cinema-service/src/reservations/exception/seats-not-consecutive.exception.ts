import { BadRequestException } from '@nestjs/common';

/**
 * Thrown when a seat selection violates Rule 1 — seats span multiple rows or have a
 * gap. Maps to HTTP 400 — e.g. `Seats must be in the same row` or
 * `Gap detected between seat 5 and seat 7`.
 */
export class SeatsNotConsecutiveException extends BadRequestException {
    constructor(message: string) {
        super(message);
    }
}
