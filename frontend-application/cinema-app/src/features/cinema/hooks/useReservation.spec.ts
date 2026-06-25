import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReservation } from './useReservation';

vi.mock('../stores/useReservationStore', () => ({ useReservationStore: vi.fn() }));
vi.mock('@/shared/hooks/useToast', () => ({ useToast: vi.fn() }));

import { useReservationStore } from '../stores/useReservationStore';
import { useToast } from '@/shared/hooks/useToast';

const useReservationStoreMock = useReservationStore as unknown as ReturnType<typeof vi.fn>;
const useToastMock = useToast as unknown as ReturnType<typeof vi.fn>;
const showToast = vi.fn();

interface FakeReservation {
    id: string;
    expiresInSeconds: number;
}

interface FakeStore {
    selectedSeatIds: Set<string>;
    activeReservation: FakeReservation | null;
    isLoading: boolean;
    error: string | null;
    selectSeat: ReturnType<typeof vi.fn>;
    deselectSeat: ReturnType<typeof vi.fn>;
    clearSelection: ReturnType<typeof vi.fn>;
    reserve: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    setActiveReservation: ReturnType<typeof vi.fn>;
}

function setStore(overrides: Partial<FakeStore> = {}): FakeStore {
    const store: FakeStore = {
        selectedSeatIds: new Set<string>(),
        activeReservation: null,
        isLoading: false,
        error: null,
        selectSeat: vi.fn(),
        deselectSeat: vi.fn(),
        clearSelection: vi.fn(),
        reserve: vi.fn().mockResolvedValue(undefined),
        confirm: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
        setActiveReservation: vi.fn(),
        ...overrides,
    };
    useReservationStoreMock.mockReturnValue(store);
    return store;
}

describe('useReservation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useToastMock.mockReturnValue({
            showToast,
            toast: { open: false, message: '', severity: 'info' },
            closeToast: vi.fn(),
        });
    });

    describe('reserve', () => {
        it('delegates the DTO to the store and shows a success toast', async () => {
            const store = setStore();
            const { result } = renderHook(() => useReservation());

            await act(async () => {
                await result.current.reserve({ seatIds: ['seat-A1', 'seat-A2'] });
            });

            expect(store.reserve).toHaveBeenCalledWith({ seatIds: ['seat-A1', 'seat-A2'] });
            expect(showToast).toHaveBeenCalledWith('Seats reserved! You have 15 minutes to confirm.', 'success');
        });

        it('shows an error toast with the store message on failure', async () => {
            setStore({ reserve: vi.fn().mockRejectedValue(new Error('x')), error: 'Seats are no longer available' });
            const { result } = renderHook(() => useReservation());

            await act(async () => {
                await result.current.reserve({ seatIds: ['seat-A1'] });
            });

            expect(showToast).toHaveBeenCalledWith('Seats are no longer available', 'error');
        });
    });

    describe('confirm', () => {
        it('delegates the DTO and shows a success toast', async () => {
            const store = setStore();
            const { result } = renderHook(() => useReservation());

            await act(async () => {
                await result.current.confirm({ reservationId: 'res-1' });
            });

            expect(store.confirm).toHaveBeenCalledWith({ reservationId: 'res-1' });
            expect(showToast).toHaveBeenCalledWith('Booking confirmed!', 'success');
        });

        it('shows an error toast on failure', async () => {
            setStore({ confirm: vi.fn().mockRejectedValue(new Error('x')) });
            const { result } = renderHook(() => useReservation());

            await act(async () => {
                await result.current.confirm({ reservationId: 'res-1' });
            });

            expect(showToast).toHaveBeenCalledWith('Confirmation failed', 'error');
        });
    });

    describe('cancel', () => {
        it('delegates the DTO and shows an info toast', async () => {
            const store = setStore();
            const { result } = renderHook(() => useReservation());

            await act(async () => {
                await result.current.cancel({ reservationId: 'res-1' });
            });

            expect(store.cancel).toHaveBeenCalledWith({ reservationId: 'res-1' });
            expect(showToast).toHaveBeenCalledWith('Reservation cancelled', 'info');
        });
    });

    describe('selection passthrough', () => {
        it('exposes the store selection actions and state', () => {
            const store = setStore({ selectedSeatIds: new Set(['seat-A1']), isLoading: true });
            const { result } = renderHook(() => useReservation());

            expect(result.current.selectedSeatIds).toBe(store.selectedSeatIds);
            expect(result.current.isLoading).toBe(true);
            expect(result.current.selectSeat).toBe(store.selectSeat);
            expect(result.current.deselectSeat).toBe(store.deselectSeat);
            expect(result.current.clearSelection).toBe(store.clearSelection);
        });
    });

    describe('countdown timer', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('starts from the active reservation expiry and ticks down each second', () => {
            setStore({ activeReservation: { id: 'res-1', expiresInSeconds: 3 } });
            const { result } = renderHook(() => useReservation());

            expect(result.current.countdown).toBe(3);

            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(result.current.countdown).toBe(2);
        });

        it('clears the hold and warns the user when it reaches zero', () => {
            const store = setStore({ activeReservation: { id: 'res-1', expiresInSeconds: 2 } });
            const { result } = renderHook(() => useReservation());

            act(() => {
                vi.advanceTimersByTime(2000);
            });

            expect(result.current.countdown).toBe(0);
            expect(store.setActiveReservation).toHaveBeenCalledWith(null);
            expect(showToast).toHaveBeenCalledWith('Your reservation has expired', 'warning');
        });

        it('stays at zero when there is no active reservation', () => {
            setStore({ activeReservation: null });
            const { result } = renderHook(() => useReservation());

            expect(result.current.countdown).toBe(0);
        });
    });
});
