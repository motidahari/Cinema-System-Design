import { create } from 'zustand';
import { cinemaService } from '../services/CinemaService';
import { Seat } from '../models/Seat';
import type { SeatStatus } from '../types';

// Seating-map state. Seats are fetched once on view mount and then patched in place
// by realtime socket events (updateSeatStatus / updateSeatsStatus), so the grid stays
// in sync without re-fetching. Counts are exposed as functions (not stored values) so
// they always reflect the latest seats array.
interface CinemaState {
    seats: Seat[];
    isLoading: boolean;
    error: string | null;
    // Computed
    availableCount: () => number;
    reservedCount: () => number;
    bookedCount: () => number;
    getSeatsByRow: () => Record<string, Seat[]>;
    // Actions
    fetchSeats: () => Promise<void>;
    updateSeatStatus: (seatId: string, status: SeatStatus) => void;
    updateSeatsStatus: (seatIds: string[], status: SeatStatus) => void;
}

export const useCinemaStore = create<CinemaState>((set, get) => ({
    seats: [],
    isLoading: false,
    error: null,

    availableCount: () => get().seats.filter((s) => s.status === 'AVAILABLE').length,
    reservedCount: () => get().seats.filter((s) => s.status === 'RESERVED').length,
    bookedCount: () => get().seats.filter((s) => s.status === 'BOOKED').length,

    getSeatsByRow() {
        return get().seats.reduce<Record<string, Seat[]>>((acc, seat) => {
            (acc[seat.row] ??= []).push(seat);
            return acc;
        }, {});
    },

    async fetchSeats() {
        set({ isLoading: true, error: null });
        try {
            const { seats } = await cinemaService.getSeatingMap();
            set({ seats, isLoading: false });
        } catch {
            set({ error: 'Failed to load seating map', isLoading: false });
        }
    },

    updateSeatStatus(seatId, status) {
        set((state) => ({
            seats: state.seats.map((s) => (s.id === seatId ? s.withStatus(status) : s)),
        }));
    },

    updateSeatsStatus(seatIds, status) {
        const idSet = new Set(seatIds);
        set((state) => ({
            seats: state.seats.map((s) => (idSet.has(s.id) ? s.withStatus(status) : s)),
        }));
    },
}));
