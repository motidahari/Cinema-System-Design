// Cinema domain types — mirror the cinema-service contract (API-CONTRACT.md §2, §5)
// and the shared @cinema/internal-sdk shapes. Seats and reservations are delivered
// as plain JSON; statuses are string unions matching the backend enums.

export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'BOOKED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface Seat {
    id: string;
    row: string; // 'A'–'M'
    number: number; // 1–10 (A–J) or 1–5 (K–M)
    status: SeatStatus;
}

export interface Reservation {
    id: string;
    status: ReservationStatus;
    expiresAt: string; // ISO 8601
    expiresInSeconds: number; // remaining seconds (0 if expired/confirmed)
    seatIds: string[];
}

// POST /reservations request body.
export interface ReserveDto {
    seatIds: string[];
}

// Response envelopes.
export interface SeatingMapResponse {
    seats: Seat[];
}

export interface MyReservationsResponse {
    reservations: Reservation[];
}
