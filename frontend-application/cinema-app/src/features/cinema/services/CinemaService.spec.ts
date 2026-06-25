import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CinemaService } from './CinemaService';
import { Seat } from '../models/Seat';
import type { SeatDto } from '../types';

const seatDtos: SeatDto[] = [
    { id: 'seat-A1', row: 'A', number: 1, status: 'AVAILABLE' },
    { id: 'seat-A2', row: 'A', number: 2, status: 'RESERVED' },
];

// Replace the inherited axios client with a stub so we assert endpoint mapping +
// domain hydration only; CSRF/refresh behaviour is covered by BaseHttpService's spec.
function makeService() {
    const get = vi.fn();
    const service = new CinemaService();
    (service as unknown as { http: { get: typeof get } }).http = { get };
    return { service, get };
}

describe('CinemaService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('getSeatingMap', () => {
        it('GETs /seats and hydrates the payload into Seat domain models', async () => {
            const { service, get } = makeService();
            get.mockResolvedValue({ data: { seats: seatDtos } });

            const { seats } = await service.getSeatingMap();

            expect(get).toHaveBeenCalledWith('/seats');
            expect(seats).toHaveLength(2);
            expect(seats[0]).toBeInstanceOf(Seat);
            expect(seats[0].label).toBe('A1');
            expect(seats[0].isAvailable).toBe(true);
            expect(seats[1].isReserved).toBe(true);
        });
    });
});
