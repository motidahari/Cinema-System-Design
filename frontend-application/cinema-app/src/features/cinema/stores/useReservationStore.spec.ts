import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReservationStore } from './useReservationStore';
import { Reservation } from '../models/Reservation';

import { ReservationStatus } from '@/features/cinema/enums';
vi.mock('../services/ReservationService', () => ({
    reservationService: {
        reserve: vi.fn(),
        confirm: vi.fn(),
        cancel: vi.fn(),
        getReservations: vi.fn(),
    },
}));

import { reservationService } from '../services/ReservationService';

const mocked = reservationService as unknown as {
    reserve: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    getReservations: ReturnType<typeof vi.fn>;
};

const reservation = new Reservation({
    id: 'res-1',
    status: ReservationStatus.PENDING,
    expiresAt: '2026-06-21T10:15:00.000Z',
    expiresInSeconds: 900,
    seatIds: ['A1', 'A2'],
});

function resetStore() {
    useReservationStore.setState({
        selectedSeatIds: new Set<string>(),
        activeReservation: null,
        myReservations: [],
        isLoading: false,
        error: null,
    });
}

describe('useReservationStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('selection', () => {
        it('selects and deselects seats without mutating the previous set', () => {
            const { selectSeat } = useReservationStore.getState();
            selectSeat('A1');
            const first = useReservationStore.getState().selectedSeatIds;
            selectSeat('A2');
            const second = useReservationStore.getState().selectedSeatIds;

            expect([...second]).toEqual(['A1', 'A2']);
            expect(second).not.toBe(first); // new Set instance each update

            useReservationStore.getState().deselectSeat('A1');
            expect([...useReservationStore.getState().selectedSeatIds]).toEqual(['A2']);
        });

        it('clears the entire selection', () => {
            useReservationStore.setState({ selectedSeatIds: new Set(['A1', 'A2']) });

            useReservationStore.getState().clearSelection();

            expect(useReservationStore.getState().selectedSeatIds.size).toBe(0);
        });
    });

    describe('reserve', () => {
        it('reserves the given seats and stores the active hold', async () => {
            useReservationStore.setState({ selectedSeatIds: new Set(['A1', 'A2']) });
            mocked.reserve.mockResolvedValue(reservation);

            await useReservationStore.getState().reserve({ seatIds: ['A1', 'A2'] });

            expect(mocked.reserve).toHaveBeenCalledWith({ seatIds: ['A1', 'A2'] });
            const state = useReservationStore.getState();
            expect(state.activeReservation).toBe(reservation);
            expect(state.activeReservation?.isPending).toBe(true);
            expect(state.selectedSeatIds.size).toBe(0);
            expect(state.isLoading).toBe(false);
        });

        it('captures the API error message and rethrows on failure', async () => {
            mocked.reserve.mockRejectedValue({ response: { data: { errorMessage: 'Seats A1 are not available' } } });

            await expect(useReservationStore.getState().reserve({ seatIds: ['A1'] })).rejects.toBeTruthy();

            const state = useReservationStore.getState();
            expect(state.error).toBe('Seats A1 are not available');
            expect(state.activeReservation).toBeNull();
            expect(state.isLoading).toBe(false);
        });
    });

    describe('confirm', () => {
        it('stores the confirmed reservation on success', async () => {
            const confirmed = new Reservation({
                id: 'res-1',
                status: ReservationStatus.CONFIRMED,
                expiresAt: '2026-06-21T10:15:00.000Z',
                expiresInSeconds: 0,
                seatIds: ['A1', 'A2'],
            });
            mocked.confirm.mockResolvedValue(confirmed);

            await useReservationStore.getState().confirm({ reservationId: 'res-1' });

            expect(mocked.confirm).toHaveBeenCalledWith({ reservationId: 'res-1' });
            expect(useReservationStore.getState().activeReservation).toBe(confirmed);
        });

        it('falls back to a default message when the error has no API payload', async () => {
            mocked.confirm.mockRejectedValue(new Error('boom'));

            await expect(useReservationStore.getState().confirm({ reservationId: 'res-1' })).rejects.toBeTruthy();
            expect(useReservationStore.getState().error).toBe('Confirmation failed');
        });
    });

    describe('cancel', () => {
        it('clears the active reservation on success', async () => {
            useReservationStore.setState({ activeReservation: reservation });
            mocked.cancel.mockResolvedValue(undefined);

            await useReservationStore.getState().cancel({});

            expect(mocked.cancel).toHaveBeenCalledWith({});
            expect(useReservationStore.getState().activeReservation).toBeNull();
        });

        it('captures the error message and rethrows on failure', async () => {
            mocked.cancel.mockRejectedValue({
                response: { data: { errorMessage: 'No active reservation' } },
            });

            await expect(useReservationStore.getState().cancel({})).rejects.toBeTruthy();
            expect(useReservationStore.getState().error).toBe('No active reservation');
        });
    });

    describe('getReservations', () => {
        it('loads the user reservations and restores the pending one as active', async () => {
            mocked.getReservations.mockResolvedValue({ reservations: [reservation] });

            await useReservationStore.getState().getReservations();

            expect(useReservationStore.getState().myReservations).toEqual([reservation]);
            expect(useReservationStore.getState().activeReservation).toBe(reservation);
            expect(useReservationStore.getState().isLoading).toBe(false);
        });

        it('restores a CONFIRMED booking as active when there is no pending hold (so it can be cancelled)', async () => {
            const confirmed = new Reservation({
                id: 'res-2',
                status: ReservationStatus.CONFIRMED,
                expiresAt: '2026-06-21T10:15:00.000Z',
                expiresInSeconds: 0,
                seatIds: ['A3', 'A4'],
            });
            useReservationStore.setState({ activeReservation: reservation });
            mocked.getReservations.mockResolvedValue({ reservations: [confirmed] });

            await useReservationStore.getState().getReservations();

            expect(useReservationStore.getState().myReservations).toEqual([confirmed]);
            expect(useReservationStore.getState().activeReservation).toBe(confirmed);
        });

        it('clears the active reservation when there are no active reservations', async () => {
            useReservationStore.setState({ activeReservation: reservation });
            mocked.getReservations.mockResolvedValue({ reservations: [] });

            await useReservationStore.getState().getReservations();

            expect(useReservationStore.getState().activeReservation).toBeNull();
        });

        it('captures the API error message and rethrows on failure', async () => {
            mocked.getReservations.mockRejectedValue({
                response: { data: { errorMessage: 'Cannot load reservations' } },
            });

            await expect(useReservationStore.getState().getReservations()).rejects.toBeTruthy();

            expect(useReservationStore.getState().error).toBe('Cannot load reservations');
            expect(useReservationStore.getState().isLoading).toBe(false);
        });
    });

    describe('setActiveReservation', () => {
        it('sets and clears the active reservation', () => {
            useReservationStore.getState().setActiveReservation(reservation);
            expect(useReservationStore.getState().activeReservation).toBe(reservation);

            useReservationStore.getState().setActiveReservation(null);
            expect(useReservationStore.getState().activeReservation).toBeNull();
        });
    });
});
