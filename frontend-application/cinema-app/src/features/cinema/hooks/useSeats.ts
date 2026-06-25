import { useEffect } from 'react';
import { useCinemaStore } from '../stores/useCinemaStore';

// View-facing seating hook: fetches the seating map once on mount and exposes the
// store's seats, grouped rows and status counts ready for rendering. Counts and the
// row grouping are read through the store's computed getters so they always reflect
// the latest seats (including realtime socket patches from useSocket).
export function useSeats() {
    const store = useCinemaStore();

    useEffect(() => {
        void store.getSeatingMap();
        // Run once on mount; getSeatingMap is a stable store action.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        seats: store.seats,
        seatsByRow: store.getSeatsByRow(),
        isLoading: store.isLoading,
        error: store.error,
        availableCount: store.availableCount(),
        reservedCount: store.reservedCount(),
        bookedCount: store.bookedCount(),
        refetch: store.getSeatingMap,
    };
}
