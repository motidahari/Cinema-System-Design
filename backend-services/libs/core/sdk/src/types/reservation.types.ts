export enum ReservationStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
}

export interface Reservation {
    id: string;
    status: ReservationStatus;
    expiresAt: string;
    expiresInSeconds: number;
    seatIds: string[];
}
