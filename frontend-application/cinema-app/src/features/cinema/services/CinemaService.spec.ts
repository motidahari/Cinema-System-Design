import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CinemaService } from './CinemaService';
import type { Seat } from '../types';

const seats: Seat[] = [
    { id: 'seat-A1', row: 'A', number: 1, status: 'AVAILABLE' },
    { id: 'seat-A2', row: 'A', number: 2, status: 'RESERVED' },
];

// Replace the inherited axios client with a stub so we assert endpoint mapping only;
// CSRF/refresh behaviour is covered by BaseHttpService's own spec.
function makeService() {
    const get = vi.fn();
    const service = new CinemaService();
    (service as unknown as { http: { get: typeof get } }).http = { get };
    return { service, get };
}

describe('CinemaService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('getSeatingMap', () => {
        it('GETs /seats and returns the seats payload', async () => {
            const { service, get } = makeService();
            get.mockResolvedValue({ data: { seats } });

            const result = await service.getSeatingMap();

            expect(get).toHaveBeenCalledWith('/seats');
            expect(result).toEqual({ seats });
        });
    });
});
