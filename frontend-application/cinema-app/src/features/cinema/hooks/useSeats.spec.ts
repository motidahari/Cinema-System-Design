import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSeats } from './useSeats';

vi.mock('../stores/useCinemaStore', () => ({ useCinemaStore: vi.fn() }));

import { useCinemaStore } from '../stores/useCinemaStore';

const useCinemaStoreMock = useCinemaStore as unknown as ReturnType<typeof vi.fn>;

interface FakeStore {
    seats: Array<{ id: string; row: string; number: number; status: string }>;
    isLoading: boolean;
    error: string | null;
    getSeatingMap: ReturnType<typeof vi.fn>;
    getSeatsByRow: ReturnType<typeof vi.fn>;
    availableCount: ReturnType<typeof vi.fn>;
    reservedCount: ReturnType<typeof vi.fn>;
    bookedCount: ReturnType<typeof vi.fn>;
}

function setStore(overrides: Partial<FakeStore> = {}): FakeStore {
    const store: FakeStore = {
        seats: [],
        isLoading: false,
        error: null,
        getSeatingMap: vi.fn().mockResolvedValue(undefined),
        getSeatsByRow: vi.fn().mockReturnValue({}),
        availableCount: vi.fn().mockReturnValue(0),
        reservedCount: vi.fn().mockReturnValue(0),
        bookedCount: vi.fn().mockReturnValue(0),
        ...overrides,
    };
    useCinemaStoreMock.mockReturnValue(store);
    return store;
}

describe('useSeats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches the seating map once on mount', () => {
        const store = setStore();

        renderHook(() => useSeats());

        expect(store.getSeatingMap).toHaveBeenCalledTimes(1);
    });

    it('exposes seats, grouped rows and loading/error from the store', () => {
        const seats = [{ id: 'seat-A1', row: 'A', number: 1, status: 'AVAILABLE' }];
        const seatsByRow = { A: seats };
        const store = setStore({
            seats,
            isLoading: true,
            error: 'boom',
            getSeatsByRow: vi.fn().mockReturnValue(seatsByRow),
        });

        const { result } = renderHook(() => useSeats());

        expect(result.current.seats).toBe(seats);
        expect(result.current.seatsByRow).toBe(seatsByRow);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBe('boom');
        expect(store.getSeatsByRow).toHaveBeenCalled();
    });

    it('exposes the computed status counts', () => {
        setStore({
            availableCount: vi.fn().mockReturnValue(110),
            reservedCount: vi.fn().mockReturnValue(3),
            bookedCount: vi.fn().mockReturnValue(2),
        });

        const { result } = renderHook(() => useSeats());

        expect(result.current.availableCount).toBe(110);
        expect(result.current.reservedCount).toBe(3);
        expect(result.current.bookedCount).toBe(2);
    });

    it('exposes getSeatingMap as refetch', () => {
        const store = setStore();

        const { result } = renderHook(() => useSeats());

        expect(result.current.refetch).toBe(store.getSeatingMap);
    });
});
