import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from './ReservationService';
import { Reservation } from '../models/Reservation';
import type { ReservationDto } from '../types';

import { ReservationStatus } from '@/features/cinema/enums';
const reservationDto: ReservationDto = {
    id: 'res-1',
    status: ReservationStatus.PENDING,
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
        it('POSTs seatIds (with an Idempotency-Key) and hydrates a Reservation model', async () => {
            const { service, post } = makeService();
            post.mockResolvedValue({ data: reservationDto });

            const result = await service.reserve({ seatIds: ['seat-A1', 'seat-A2'] });

            expect(post).toHaveBeenCalledWith(
                '/reservations',
                { seatIds: ['seat-A1', 'seat-A2'] },
                { headers: { 'Idempotency-Key': 'idem-key-1' } }
            );
            expect(result).toBeInstanceOf(Reservation);
            expect(result.id).toBe('res-1');
            expect(result.isPending).toBe(true);
        });
    });

    describe('confirm', () => {
        it('POSTs to /reservations/:id/confirm and hydrates the updated model', async () => {
            const { service, post } = makeService();
            post.mockResolvedValue({
                data: { ...reservationDto, status: ReservationStatus.CONFIRMED, expiresInSeconds: 0 },
            });

            const result = await service.confirm({ reservationId: 'res-1' });

            expect(post).toHaveBeenCalledWith('/reservations/res-1/confirm');
            expect(result).toBeInstanceOf(Reservation);
            expect(result.isConfirmed).toBe(true);
        });
    });

    describe('cancel', () => {
        it('DELETEs /reservations (caller resolved from auth context)', async () => {
            const { service, del } = makeService();
            del.mockResolvedValue({ data: undefined });

            await service.cancel({});

            expect(del).toHaveBeenCalledWith('/reservations');
        });
    });

    describe('getReservations', () => {
        it('GETs /reservations and hydrates each payload into a Reservation model', async () => {
            const { service, get } = makeService();
            get.mockResolvedValue({ data: { reservations: [reservationDto] } });

            const { reservations } = await service.getReservations();

            expect(get).toHaveBeenCalledWith('/reservations');
            expect(reservations).toHaveLength(1);
            expect(reservations[0]).toBeInstanceOf(Reservation);
            expect(reservations[0].seatCount).toBe(2);
        });
    });
});
