import { SeatStatus } from '../enums/seat-status.enum';

export interface Seat {
    id: string;
    row: string;
    number: number;
    status: SeatStatus;
}
