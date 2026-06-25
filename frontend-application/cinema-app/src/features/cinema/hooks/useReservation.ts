import { useEffect, useState } from 'react';
import { useReservationStore } from '../stores/useReservationStore';
import { useToast } from '@/shared/hooks/useToast';
import type { CancelDto, ConfirmDto, ReserveDto } from '../types';

// Orchestration layer over useReservationStore: it owns the user-facing toasts and the
// countdown timer for the active (PENDING) hold, so the store stays free of UI concerns.
// The action names (reserve/confirm/cancel) and their DTO args mirror the store and the
// ReservationService 1:1.
export function useReservation() {
    const store = useReservationStore();
    const { showToast } = useToast();
    const [countdown, setCountdown] = useState<number>(0);

    // Tick down the hold's remaining time; when it hits zero the hold is gone, so we
    // clear it locally and warn the user. Keyed on the reservation id so a new hold
    // restarts the timer and confirm/cancel stops it.
    useEffect(() => {
        if (!store.activeReservation) {
            setCountdown(0);
            return;
        }
        setCountdown(store.activeReservation.expiresInSeconds);

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    store.setActiveReservation(null);
                    showToast('Your reservation has expired', 'warning');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
        // Restart only when the active hold changes; store actions are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.activeReservation?.id]);

    const reserve = async (dto: ReserveDto): Promise<void> => {
        try {
            await store.reserve(dto);
            showToast('Seats reserved! You have 15 minutes to confirm.', 'success');
        } catch {
            showToast(store.error ?? 'Reservation failed', 'error');
        }
    };

    const confirm = async (dto: ConfirmDto): Promise<void> => {
        try {
            await store.confirm(dto);
            showToast('Booking confirmed!', 'success');
        } catch {
            showToast(store.error ?? 'Confirmation failed', 'error');
        }
    };

    const cancel = async (dto: CancelDto): Promise<void> => {
        try {
            await store.cancel(dto);
            showToast('Reservation cancelled', 'info');
        } catch {
            showToast(store.error ?? 'Cancellation failed', 'error');
        }
    };

    return {
        selectedSeatIds: store.selectedSeatIds,
        activeReservation: store.activeReservation,
        isLoading: store.isLoading,
        countdown,
        selectSeat: store.selectSeat,
        deselectSeat: store.deselectSeat,
        clearSelection: store.clearSelection,
        reserve,
        confirm,
        cancel,
    };
}
