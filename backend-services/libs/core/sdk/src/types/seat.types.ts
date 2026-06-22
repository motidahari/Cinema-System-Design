export enum SeatStatus {
    AVAILABLE = 'AVAILABLE',
    RESERVED = 'RESERVED',
    BOOKED = 'BOOKED',
}

export interface Seat {
    id: string;
    row: string;
    number: number;
    status: SeatStatus;
}
