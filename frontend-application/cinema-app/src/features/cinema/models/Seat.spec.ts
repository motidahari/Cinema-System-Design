import { describe, it, expect } from 'vitest';
import { Seat } from './Seat';

import { SeatStatus } from '@/features/cinema/enums';
describe('Seat', () => {
    it('hydrates all fields from the DTO', () => {
        const seat = new Seat({ id: 'A1', row: 'A', number: 1, status: SeatStatus.AVAILABLE });

        expect(seat.id).toBe('A1');
        expect(seat.row).toBe('A');
        expect(seat.number).toBe(1);
        expect(seat.status).toBe(SeatStatus.AVAILABLE);
    });

    it('exposes status predicates', () => {
        expect(new Seat({ id: 'A1', row: 'A', number: 1, status: SeatStatus.AVAILABLE }).isAvailable).toBe(true);
        expect(new Seat({ id: 'A2', row: 'A', number: 2, status: SeatStatus.RESERVED }).isReserved).toBe(true);
        expect(new Seat({ id: 'A3', row: 'A', number: 3, status: SeatStatus.BOOKED }).isBooked).toBe(true);
    });

    it('builds a display label from row + number', () => {
        expect(new Seat({ id: 'K5', row: 'K', number: 5, status: SeatStatus.AVAILABLE }).label).toBe('K5');
    });

    describe('withStatus', () => {
        it('returns a new Seat with the updated status, leaving the original untouched', () => {
            const seat = new Seat({ id: 'A1', row: 'A', number: 1, status: SeatStatus.AVAILABLE });

            const next = seat.withStatus(SeatStatus.BOOKED);

            expect(next).toBeInstanceOf(Seat);
            expect(next).not.toBe(seat);
            expect(next.status).toBe(SeatStatus.BOOKED);
            expect(seat.status).toBe(SeatStatus.AVAILABLE);
        });
    });
});
