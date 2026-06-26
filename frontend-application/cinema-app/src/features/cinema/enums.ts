// Cinema domain enums. Values mirror the wire strings and the backend SDK enums
// (@cinema/internal-sdk seat-status.enum / reservation-status.enum).

export enum SeatStatus {
    AVAILABLE = 'AVAILABLE',
    RESERVED = 'RESERVED',
    BOOKED = 'BOOKED',
}

export enum ReservationStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
}
