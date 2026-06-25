import { describe, it, expect } from 'vitest';
import { Reservation } from './Reservation';
import type { ReservationDto } from '../types';

const base: ReservationDto = {
    id: 'res-1',
    status: 'PENDING',
    expiresAt: '2026-06-21T10:15:00.000Z',
    expiresInSeconds: 900,
    seatIds: ['A1', 'A2'],
};

describe('Reservation', () => {
    it('hydrates all fields from the DTO', () => {
        const reservation = new Reservation(base);

        expect(reservation.id).toBe('res-1');
        expect(reservation.status).toBe('PENDING');
        expect(reservation.expiresAt).toBe('2026-06-21T10:15:00.000Z');
        expect(reservation.expiresInSeconds).toBe(900);
        expect(reservation.seatIds).toEqual(['A1', 'A2']);
    });

    it('exposes lifecycle predicates', () => {
        expect(new Reservation({ ...base, status: 'PENDING' }).isPending).toBe(true);
        expect(new Reservation({ ...base, status: 'CONFIRMED' }).isConfirmed).toBe(true);
        expect(new Reservation({ ...base, status: 'EXPIRED' }).isExpired).toBe(true);
        expect(new Reservation({ ...base, status: 'CANCELLED' }).isCancelled).toBe(true);
    });

    it('reports the number of held seats', () => {
        expect(new Reservation(base).seatCount).toBe(2);
    });
});
