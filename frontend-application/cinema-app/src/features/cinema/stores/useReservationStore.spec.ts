import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReservationStore } from './useReservationStore';
import type { Reservation } from '../types';

vi.mock('../services/ReservationService', () => ({
    reservationService: {
        reserve: vi.fn(),
        confirm: vi.fn(),
        cancel: vi.fn(),
        getMyReservations: vi.fn(),
    },
}));

import { reservationService } from '../services/ReservationService';

const mocked = reservationService as unknown as {
    reserve: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    getMyReservations: ReturnType<typeof vi.fn>;
};

const reservation: Reservation = {
    id: 'res-1',
    status: 'PENDING',
    expiresAt: '2026-06-21T10:15:00.000Z',
    expiresInSeconds: 900,
    seatIds: ['A1', 'A2'],
};

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

    describe('submitReservation', () => {
        it('reserves the selected seats and stores the active hold', async () => {
            useReservationStore.setState({ selectedSeatIds: new Set(['A1', 'A2']) });
            mocked.reserve.mockResolvedValue(reservation);

            await useReservationStore.getState().submitReservation();

            expect(mocked.reserve).toHaveBeenCalledWith({ seatIds: ['A1', 'A2'] });
            const state = useReservationStore.getState();
            expect(state.activeReservation).toEqual(reservation);
            expect(state.selectedSeatIds.size).toBe(0);
            expect(state.isLoading).toBe(false);
        });

        it('captures the API error message and rethrows on failure', async () => {
            useReservationStore.setState({ selectedSeatIds: new Set(['A1']) });
            mocked.reserve.mockRejectedValue({ response: { data: { errorMessage: 'Seats A1 are not available' } } });

            await expect(useReservationStore.getState().submitReservation()).rejects.toBeTruthy();

            const state = useReservationStore.getState();
            expect(state.error).toBe('Seats A1 are not available');
            expect(state.activeReservation).toBeNull();
            expect(state.isLoading).toBe(false);
        });
    });

    describe('confirmReservation', () => {
        it('stores the confirmed reservation on success', async () => {
            const confirmed = { ...reservation, status: 'CONFIRMED' as const, expiresInSeconds: 0 };
            mocked.confirm.mockResolvedValue(confirmed);

            await useReservationStore.getState().confirmReservation('res-1');

            expect(mocked.confirm).toHaveBeenCalledWith('res-1');
            expect(useReservationStore.getState().activeReservation).toEqual(confirmed);
        });

        it('falls back to a default message when the error has no API payload', async () => {
            mocked.confirm.mockRejectedValue(new Error('boom'));

            await expect(useReservationStore.getState().confirmReservation('res-1')).rejects.toBeTruthy();
            expect(useReservationStore.getState().error).toBe('Confirmation failed');
        });
    });

    describe('cancelReservation', () => {
        it('clears the active reservation on success', async () => {
            useReservationStore.setState({ activeReservation: reservation });
            mocked.cancel.mockResolvedValue(undefined);

            await useReservationStore.getState().cancelReservation('res-1');

            expect(mocked.cancel).toHaveBeenCalledWith('res-1');
            expect(useReservationStore.getState().activeReservation).toBeNull();
        });

        it('captures the error message and rethrows on failure', async () => {
            mocked.cancel.mockRejectedValue({
                response: { data: { errorMessage: 'Cannot cancel a CONFIRMED reservation' } },
            });

            await expect(useReservationStore.getState().cancelReservation('res-1')).rejects.toBeTruthy();
            expect(useReservationStore.getState().error).toBe('Cannot cancel a CONFIRMED reservation');
        });
    });

    describe('fetchMyReservations', () => {
        it('loads the user reservations into state', async () => {
            mocked.getMyReservations.mockResolvedValue({ reservations: [reservation] });

            await useReservationStore.getState().fetchMyReservations();

            expect(useReservationStore.getState().myReservations).toEqual([reservation]);
        });
    });

    describe('setActiveReservation', () => {
        it('sets and clears the active reservation', () => {
            useReservationStore.getState().setActiveReservation(reservation);
            expect(useReservationStore.getState().activeReservation).toEqual(reservation);

            useReservationStore.getState().setActiveReservation(null);
            expect(useReservationStore.getState().activeReservation).toBeNull();
        });
    });
});
