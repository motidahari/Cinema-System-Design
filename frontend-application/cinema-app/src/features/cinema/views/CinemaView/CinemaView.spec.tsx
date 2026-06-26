import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import en from '@/locales/en';

const reservationStoreMock = vi.hoisted(() => {
    const getMyReservations = vi.fn().mockResolvedValue(undefined);
    let state = { activeReservation: null as { isPending: boolean } | null, error: null as string | null };
    const useReservationStore = vi.fn((selector: (s: { getMyReservations: typeof getMyReservations }) => unknown) =>
        selector({ getMyReservations })
    ) as unknown as ReturnType<typeof vi.fn> & {
        getState: ReturnType<typeof vi.fn>;
        setState: (next: typeof state) => void;
        reset: () => void;
        getMyReservations: typeof getMyReservations;
    };
    useReservationStore.getState = vi.fn(() => state);
    useReservationStore.setState = (next) => {
        state = next;
    };
    useReservationStore.reset = () => {
        state = { activeReservation: null, error: null };
        getMyReservations.mockResolvedValue(undefined);
    };
    useReservationStore.getMyReservations = getMyReservations;
    return { useReservationStore };
});

// Provide English translations without a live i18next instance.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) => {
            const parts = key.split('.');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let value: any = en;
            for (const part of parts) value = value?.[part];
            if (typeof value === 'string' && opts) {
                return Object.entries(opts).reduce((acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)), value);
            }
            return typeof value === 'string' ? value : key;
        },
    }),
}));

// Mock all sub-components and hooks so this spec is isolated to CinemaView's own logic.
vi.mock('../../hooks/useSeats', () => ({ useSeats: vi.fn() }));
vi.mock('@/shared/hooks/useToast', () => ({ useToast: vi.fn() }));
vi.mock('../../stores/useReservationStore', () => ({ useReservationStore: reservationStoreMock.useReservationStore }));
vi.mock('../../components/SeatingMap', () => ({ default: () => <div data-testid="seating-map" /> }));
vi.mock('../../components/ReservationPanel', () => ({ default: () => <div data-testid="reservation-panel" /> }));

import CinemaView from './CinemaView';
import { useSeats } from '../../hooks/useSeats';
import { useToast } from '@/shared/hooks/useToast';

const useSeatsMock = useSeats as unknown as ReturnType<typeof vi.fn>;
const useToastMock = useToast as unknown as ReturnType<typeof vi.fn>;
const showToast = vi.fn();

function stubHooks(counts: { availableCount?: number; reservedCount?: number; bookedCount?: number } = {}): void {
    useSeatsMock.mockReturnValue({
        seats: [],
        seatsByRow: {},
        isLoading: false,
        error: null,
        availableCount: counts.availableCount ?? 50,
        reservedCount: counts.reservedCount ?? 10,
        bookedCount: counts.bookedCount ?? 5,
        refetch: vi.fn(),
    });
    useToastMock.mockReturnValue({
        toast: { open: false, message: '', severity: 'info' as const },
        showToast,
        closeToast: vi.fn(),
    });
}

describe('CinemaView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        reservationStoreMock.useReservationStore.reset();
        stubHooks();
    });

    it('renders the SeatingMap and ReservationPanel', () => {
        render(<CinemaView />);

        expect(screen.getByTestId('seating-map')).toBeInTheDocument();
        expect(screen.getByTestId('reservation-panel')).toBeInTheDocument();
    });

    it('renders seat-count chips with the values from useSeats', () => {
        stubHooks({ availableCount: 42, reservedCount: 7, bookedCount: 3 });
        render(<CinemaView />);

        expect(screen.getByLabelText('42 available seats')).toBeInTheDocument();
        expect(screen.getByLabelText('7 reserved seats')).toBeInTheDocument();
        expect(screen.getByLabelText('3 booked seats')).toBeInTheDocument();
    });

    it('does not render an alert in the accessible tree', () => {
        render(<CinemaView />);

        // CinemaView delegates toast display to the global Toast in App.tsx.
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('loads reservations on mount and shows a toast when an active reservation is restored', async () => {
        reservationStoreMock.useReservationStore.setState({
            activeReservation: { isPending: true },
            error: null,
        });

        render(<CinemaView />);

        await waitFor(() => expect(reservationStoreMock.useReservationStore.getMyReservations).toHaveBeenCalled());
        await waitFor(() =>
            expect(showToast).toHaveBeenCalledWith('Active reservation restored. You can confirm or cancel it.', 'info')
        );
    });

    it('shows a toast with the backend error when loading reservations fails', async () => {
        reservationStoreMock.useReservationStore.getMyReservations.mockRejectedValueOnce(new Error('x'));
        reservationStoreMock.useReservationStore.setState({
            activeReservation: null,
            error: 'Cannot load reservations',
        });

        render(<CinemaView />);

        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Cannot load reservations', 'error'));
    });
});
