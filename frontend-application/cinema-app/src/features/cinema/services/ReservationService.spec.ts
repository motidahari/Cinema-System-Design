import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from './ReservationService';
import type { Reservation } from '../types';

const reservation: Reservation = {
    id: 'res-1',
    status: 'PENDING',
    expiresAt: '2026-06-21T10:15:00.000Z',
    expiresInSeconds: 900,
    seatIds: ['seat-A1', 'seat-A2'],
};

function makeService() {
    const post = vi.fn();
    const get = vi.fn();
    const del = vi.fn();
    const service = new ReservationService();
    (service as unknown as { http: { post: typeof post; get: typeof get; delete: typeof del } }).http = {
        post,
        get,
        delete: del,
    };
    return { service, post, get, del };
}

describe('ReservationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('crypto', { randomUUID: () => 'idem-key-1' });
    });

    describe('reserve', () => {
        it('POSTs the seatIds to /reservations and returns the reservation', async () => {
            const { service, post } = makeService();
            post.mockResolvedValue({ data: reservation });

            const result = await service.reserve({ seatIds: ['seat-A1', 'seat-A2'] });

            expect(post).toHaveBeenCalledWith(
                '/reservations',
                { seatIds: ['seat-A1', 'seat-A2'] },
                { headers: { 'Idempotency-Key': 'idem-key-1' } }
            );
            expect(result).toEqual(reservation);
        });
    });

    describe('confirm', () => {
        it('POSTs to /reservations/:id/confirm and returns the updated reservation', async () => {
            const { service, post } = makeService();
            const confirmed = { ...reservation, status: 'CONFIRMED' as const, expiresInSeconds: 0 };
            post.mockResolvedValue({ data: confirmed });

            const result = await service.confirm('res-1');

            expect(post).toHaveBeenCalledWith('/reservations/res-1/confirm');
            expect(result).toEqual(confirmed);
        });
    });

    describe('cancel', () => {
        it('DELETEs /reservations/:id', async () => {
            const { service, del } = makeService();
            del.mockResolvedValue({ data: undefined });

            await service.cancel('res-1');

            expect(del).toHaveBeenCalledWith('/reservations/res-1');
        });
    });

    describe('getMyReservations', () => {
        it('GETs /reservations/my and returns the reservations payload', async () => {
            const { service, get } = makeService();
            get.mockResolvedValue({ data: { reservations: [reservation] } });

            const result = await service.getMyReservations();

            expect(get).toHaveBeenCalledWith('/reservations/my');
            expect(result).toEqual({ reservations: [reservation] });
        });
    });
});
