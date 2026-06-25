import { describe, it, expect } from 'vitest';
import { Seat } from './Seat';

describe('Seat', () => {
    it('hydrates all fields from the DTO', () => {
        const seat = new Seat({ id: 'A1', row: 'A', number: 1, status: 'AVAILABLE' });

        expect(seat.id).toBe('A1');
        expect(seat.row).toBe('A');
        expect(seat.number).toBe(1);
        expect(seat.status).toBe('AVAILABLE');
    });

    it('exposes status predicates', () => {
        expect(new Seat({ id: 'A1', row: 'A', number: 1, status: 'AVAILABLE' }).isAvailable).toBe(true);
        expect(new Seat({ id: 'A2', row: 'A', number: 2, status: 'RESERVED' }).isReserved).toBe(true);
        expect(new Seat({ id: 'A3', row: 'A', number: 3, status: 'BOOKED' }).isBooked).toBe(true);
    });

    it('builds a display label from row + number', () => {
        expect(new Seat({ id: 'K5', row: 'K', number: 5, status: 'AVAILABLE' }).label).toBe('K5');
    });

    describe('withStatus', () => {
        it('returns a new Seat with the updated status, leaving the original untouched', () => {
            const seat = new Seat({ id: 'A1', row: 'A', number: 1, status: 'AVAILABLE' });

            const next = seat.withStatus('BOOKED');

            expect(next).toBeInstanceOf(Seat);
            expect(next).not.toBe(seat);
            expect(next.status).toBe('BOOKED');
            expect(seat.status).toBe('AVAILABLE');
        });
    });
});
