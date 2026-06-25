import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import en from '@/locales/en';

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
vi.mock('../../components/SeatingMap', () => ({ default: () => <div data-testid="seating-map" /> }));
vi.mock('../../components/ReservationPanel', () => ({ default: () => <div data-testid="reservation-panel" /> }));

import CinemaView from './CinemaView';
import { useSeats } from '../../hooks/useSeats';
import { useToast } from '@/shared/hooks/useToast';

const useSeatsMock = useSeats as unknown as ReturnType<typeof vi.fn>;
const useToastMock = useToast as unknown as ReturnType<typeof vi.fn>;

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
        showToast: vi.fn(),
        closeToast: vi.fn(),
    });
}

describe('CinemaView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    it('does not render the toast Snackbar when toast.open is false', () => {
        render(<CinemaView />);

        // Snackbar with open=false should not surface an alert in the accessible tree.
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('renders the toast Snackbar when toast.open is true', () => {
        useToastMock.mockReturnValue({
            toast: { open: true, message: 'Booking confirmed!', severity: 'success' as const },
            showToast: vi.fn(),
            closeToast: vi.fn(),
        });
        render(<CinemaView />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Booking confirmed!')).toBeInTheDocument();
    });
});
