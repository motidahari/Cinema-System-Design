import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCinemaStore } from './useCinemaStore';
import { Seat } from '../models/Seat';

vi.mock('../services/CinemaService', () => ({
    cinemaService: {
        getSeatingMap: vi.fn(),
    },
}));

import { cinemaService } from '../services/CinemaService';

const mocked = cinemaService as unknown as { getSeatingMap: ReturnType<typeof vi.fn> };

const seats: Seat[] = [
    new Seat({ id: 'A1', row: 'A', number: 1, status: 'AVAILABLE' }),
    new Seat({ id: 'A2', row: 'A', number: 2, status: 'RESERVED' }),
    new Seat({ id: 'A3', row: 'A', number: 3, status: 'BOOKED' }),
    new Seat({ id: 'B1', row: 'B', number: 1, status: 'AVAILABLE' }),
];

function resetStore() {
    useCinemaStore.setState({ seats: [], isLoading: false, error: null });
}

describe('useCinemaStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('getSeatingMap', () => {
        it('loads the hydrated seating map into state on success', async () => {
            mocked.getSeatingMap.mockResolvedValue({ seats });

            await useCinemaStore.getState().getSeatingMap();

            const state = useCinemaStore.getState();
            expect(state.seats).toEqual(seats);
            expect(state.seats[0]).toBeInstanceOf(Seat);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('sets an error message and stops loading on failure', async () => {
            mocked.getSeatingMap.mockRejectedValue(new Error('network'));

            await useCinemaStore.getState().getSeatingMap();

            const state = useCinemaStore.getState();
            expect(state.seats).toEqual([]);
            expect(state.error).toBe('Failed to load seating map');
            expect(state.isLoading).toBe(false);
        });
    });

    describe('computed counts', () => {
        it('counts seats by status', () => {
            useCinemaStore.setState({ seats });

            const state = useCinemaStore.getState();
            expect(state.availableCount()).toBe(2);
            expect(state.reservedCount()).toBe(1);
            expect(state.bookedCount()).toBe(1);
        });
    });

    describe('getSeatsByRow', () => {
        it('groups seats by their row', () => {
            useCinemaStore.setState({ seats });

            const byRow = useCinemaStore.getState().getSeatsByRow();

            expect(Object.keys(byRow)).toEqual(['A', 'B']);
            expect(byRow.A).toHaveLength(3);
            expect(byRow.B).toHaveLength(1);
        });
    });

    describe('updateSeatStatus', () => {
        it('patches a single seat and keeps it a Seat instance', () => {
            useCinemaStore.setState({ seats });

            useCinemaStore.getState().updateSeatStatus('A1', 'BOOKED');

            const patched = useCinemaStore.getState().seats.find((s) => s.id === 'A1');
            expect(patched).toBeInstanceOf(Seat);
            expect(patched?.isBooked).toBe(true);
        });
    });

    describe('updateSeatsStatus', () => {
        it('patches multiple seats at once and leaves others untouched', () => {
            useCinemaStore.setState({ seats });

            useCinemaStore.getState().updateSeatsStatus(['A1', 'B1'], 'RESERVED');

            const state = useCinemaStore.getState();
            expect(state.seats.find((s) => s.id === 'A1')?.status).toBe('RESERVED');
            expect(state.seats.find((s) => s.id === 'B1')?.status).toBe('RESERVED');
            expect(state.seats.find((s) => s.id === 'A3')?.status).toBe('BOOKED');
        });
    });
});
