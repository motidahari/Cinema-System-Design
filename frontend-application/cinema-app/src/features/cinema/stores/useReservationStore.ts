import { create } from 'zustand';
import { reservationService } from '../services/ReservationService';
import { isApiError } from '@/core/types/api-error';
import type { Reservation } from '../models/Reservation';

// Seat-selection + reservation-lifecycle state. `selectedSeatIds` is the user's
// pending pick (pre-submit); `activeReservation` is the PENDING hold returned by the
// server after reserve, which the user then confirms or cancels.
interface ReservationState {
    selectedSeatIds: Set<string>;
    activeReservation: Reservation | null;
    myReservations: Reservation[];
    isLoading: boolean;
    error: string | null;
    // Selection
    selectSeat: (seatId: string) => void;
    deselectSeat: (seatId: string) => void;
    clearSelection: () => void;
    // Lifecycle
    submitReservation: () => Promise<void>;
    confirmReservation: (reservationId: string) => Promise<void>;
    cancelReservation: (reservationId: string) => Promise<void>;
    fetchMyReservations: () => Promise<void>;
    setActiveReservation: (reservation: Reservation | null) => void;
}

function errorMessage(err: unknown, fallback: string): string {
    return isApiError(err) ? (err.response?.data?.errorMessage ?? fallback) : fallback;
}

export const useReservationStore = create<ReservationState>((set, get) => ({
    selectedSeatIds: new Set<string>(),
    activeReservation: null,
    myReservations: [],
    isLoading: false,
    error: null,

    selectSeat(seatId) {
        set((s) => ({ selectedSeatIds: new Set(s.selectedSeatIds).add(seatId) }));
    },

    deselectSeat(seatId) {
        set((s) => {
            const next = new Set(s.selectedSeatIds);
            next.delete(seatId);
            return { selectedSeatIds: next };
        });
    },

    clearSelection() {
        set({ selectedSeatIds: new Set<string>() });
    },

    async submitReservation() {
        set({ isLoading: true, error: null });
        try {
            const seatIds = [...get().selectedSeatIds];
            const reservation = await reservationService.reserve({ seatIds });
            set({ activeReservation: reservation, selectedSeatIds: new Set<string>(), isLoading: false });
        } catch (err) {
            set({ error: errorMessage(err, 'Reservation failed'), isLoading: false });
            throw err;
        }
    },

    async confirmReservation(reservationId) {
        set({ isLoading: true, error: null });
        try {
            const updated = await reservationService.confirm(reservationId);
            set({ activeReservation: updated, isLoading: false });
        } catch (err) {
            set({ error: errorMessage(err, 'Confirmation failed'), isLoading: false });
            throw err;
        }
    },

    async cancelReservation(reservationId) {
        set({ isLoading: true, error: null });
        try {
            await reservationService.cancel(reservationId);
            set({ activeReservation: null, isLoading: false });
        } catch (err) {
            set({ error: errorMessage(err, 'Cancellation failed'), isLoading: false });
            throw err;
        }
    },

    async fetchMyReservations() {
        const { reservations } = await reservationService.getMyReservations();
        set({ myReservations: reservations });
    },

    setActiveReservation(reservation) {
        set({ activeReservation: reservation });
    },
}));
