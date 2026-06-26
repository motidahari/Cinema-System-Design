// Raw JSON shapes returned by cinema-service. Services hydrate these DTOs into
// domain models so stores and components always work with domain objects.

export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'BOOKED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';

export interface SeatDto {
    id: string;
    row: string; // 'A'–'M'
    number: number; // 1–10 (A–J) or 1–5 (K–M)
    status: SeatStatus;
}

export interface ReservationDto {
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

// POST /reservations/:id/confirm — id carried in a DTO so the store and service
// share one signature.
export interface ConfirmDto {
    reservationId: string;
}

// DELETE /reservations — cancels all of the caller's active reservations. The user is
// identified from the auth context, so the request carries no body.
export type CancelDto = Record<string, never>;

// Response envelopes (raw wire shapes).
export interface SeatingMapResponse {
    seats: SeatDto[];
}

export interface MyReservationsResponse {
    reservations: ReservationDto[];
}
