// Test data factories — small builders with sensible defaults, overridable per test.
import { SeatStatus, ReservationStatus } from '@/features/cinema/enums';

export { SeatStatus, ReservationStatus };

export interface UserDto {
    id: string;
    email: string;
    createdAt: string;
}

export interface Seat {
    id: string;
    row: string;
    number: number;
    status: SeatStatus;
}

export interface Reservation {
    id: string;
    status: ReservationStatus;
    expiresAt: string;
    expiresInSeconds: number;
    seatIds: string[];
}

export function makeUser(overrides: Partial<UserDto> = {}): UserDto {
    return {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        email: 'alice@example.com',
        createdAt: '2026-06-21T10:00:00.000Z',
        ...overrides,
    };
}

export function makeSeat(overrides: Partial<Seat> = {}): Seat {
    return {
        id: 'seat-A1',
        row: 'A',
        number: 1,
        status: SeatStatus.AVAILABLE,
        ...overrides,
    };
}

export function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
    return {
        id: 'res-1',
        status: ReservationStatus.PENDING,
        expiresAt: '2026-06-21T10:15:00.000Z',
        expiresInSeconds: 900,
        seatIds: ['seat-A1', 'seat-A2'],
        ...overrides,
    };
}
