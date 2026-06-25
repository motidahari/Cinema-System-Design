import type { SeatDto, SeatStatus } from '../types';

// Seat domain model. Services hydrate the raw SeatDto into this class so consumers
// get behaviour (status predicates, display label) instead of a bare payload.
export class Seat {
    readonly id: string;
    readonly row: string;
    readonly number: number;
    readonly status: SeatStatus;

    constructor(data: SeatDto) {
        this.id = data.id;
        this.row = data.row;
        this.number = data.number;
        this.status = data.status;
    }

    get isAvailable(): boolean {
        return this.status === 'AVAILABLE';
    }

    get isReserved(): boolean {
        return this.status === 'RESERVED';
    }

    get isBooked(): boolean {
        return this.status === 'BOOKED';
    }

    // Human-readable seat label, e.g. "A1".
    get label(): string {
        return `${this.row}${this.number}`;
    }

    // Returns a new Seat with the given status (models are immutable).
    withStatus(status: SeatStatus): Seat {
        return new Seat({ id: this.id, row: this.row, number: this.number, status });
    }
}
