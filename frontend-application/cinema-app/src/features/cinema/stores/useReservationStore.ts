import { create } from 'zustand';
import { reservationService } from '../services/ReservationService';
import { isApiError } from '@/core/types/api-error';
import type { Reservation } from '../models/Reservation';
import type { CancelDto, ConfirmDto, ReserveDto } from '../types';

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
    // Lifecycle — names + DTO args mirror ReservationService 1:1.
    reserve: (dto: ReserveDto) => Promise<void>;
    confirm: (dto: ConfirmDto) => Promise<void>;
    cancel: (dto: CancelDto) => Promise<void>;
    getMyReservations: () => Promise<void>;
    setActiveReservation: (reservation: Reservation | null) => void;
}

function errorMessage(err: unknown, fallback: string): string {
    return isApiError(err) ? (err.response?.data?.errorMessage ?? fallback) : fallback;
}

export const useReservationStore = create<ReservationState>((set) => ({
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

    async reserve(dto) {
        set({ isLoading: true, error: null });
        try {
            const reservation = await reservationService.reserve(dto);
            set({ activeReservation: reservation, selectedSeatIds: new Set<string>(), isLoading: false });
        } catch (err) {
            set({ error: errorMessage(err, 'Reservation failed'), isLoading: false });
            throw err;
        }
    },

    async confirm(dto) {
        set({ isLoading: true, error: null });
        try {
            const updated = await reservationService.confirm(dto);
            set({ activeReservation: updated, isLoading: false });
        } catch (err) {
            set({ error: errorMessage(err, 'Confirmation failed'), isLoading: false });
            throw err;
        }
    },

    async cancel(dto) {
        set({ isLoading: true, error: null });
        try {
            await reservationService.cancel(dto);
            set({ activeReservation: null, isLoading: false });
        } catch (err) {
            set({ error: errorMessage(err, 'Cancellation failed'), isLoading: false });
            throw err;
        }
    },

    async getMyReservations() {
        set({ isLoading: true, error: null });
        try {
            const { reservations } = await reservationService.getMyReservations();
            set({
                myReservations: reservations,
                activeReservation: reservations.find((reservation) => reservation.isPending) ?? null,
                isLoading: false,
            });
        } catch (err) {
            set({ error: errorMessage(err, 'Failed to load reservations'), isLoading: false });
            throw err;
        }
    },

    setActiveReservation(reservation) {
        set({ activeReservation: reservation });
    },
}));
