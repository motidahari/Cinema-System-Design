import { SeatStatus } from '../enums/seat-status.enum';

export class Seat {
    constructor(
        readonly id: string,
        readonly row: string,
        readonly number: number,
        readonly status: SeatStatus
    ) {}
}
