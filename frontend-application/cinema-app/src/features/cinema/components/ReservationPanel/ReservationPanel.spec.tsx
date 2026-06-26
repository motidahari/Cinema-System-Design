import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Seat } from '../../models/Seat';
import { Reservation } from '../../models/Reservation';
import { makeSeat, makeReservation } from '@/test/factories';
import en from '@/locales/en';

import { ReservationStatus } from '@/features/cinema/enums';
// Provide the English strings directly so the component renders real user-visible text
// without needing a live i18next instance.
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

vi.mock('../../stores/useCinemaStore', () => ({ useCinemaStore: vi.fn() }));
vi.mock('../../hooks/useReservation', () => ({ useReservation: vi.fn() }));

import ReservationPanel from './ReservationPanel';
import { useCinemaStore } from '../../stores/useCinemaStore';
import { useReservation } from '../../hooks/useReservation';

const useCinemaStoreMock = useCinemaStore as unknown as ReturnType<typeof vi.fn>;
const useReservationMock = useReservation as unknown as ReturnType<typeof vi.fn>;

const seatA1 = new Seat(makeSeat({ id: 'seat-A1', row: 'A', number: 1 }));
const seatA2 = new Seat(makeSeat({ id: 'seat-A2', row: 'A', number: 2 }));

function stubStore(seats: Seat[] = [seatA1, seatA2]): void {
    useCinemaStoreMock.mockImplementation((selector: (s: { seats: Seat[] }) => unknown) => selector({ seats }));
}

function stubReservation(overrides: Partial<ReturnType<typeof useReservation>> = {}): void {
    useReservationMock.mockReturnValue({
        selectedSeatIds: new Set<string>(),
        activeReservation: null,
        isLoading: false,
        countdown: 0,
        reserve: vi.fn(),
        confirm: vi.fn(),
        cancel: vi.fn(),
        clearSelection: vi.fn(),
        selectSeat: vi.fn(),
        deselectSeat: vi.fn(),
        ...overrides,
    });
}

describe('ReservationPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        stubStore();
    });

    describe('selection state (no active reservation)', () => {
        it('shows prompt when no seats are selected', () => {
            stubReservation({ selectedSeatIds: new Set<string>() });
            render(<ReservationPanel />);

            expect(screen.getByText(en.reservation.selectSeats)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: en.reservation.reserve })).not.toBeInTheDocument();
        });

        it('shows selected count and reserve button when seats are selected', () => {
            stubReservation({ selectedSeatIds: new Set(['seat-A1', 'seat-A2']) });
            render(<ReservationPanel />);

            expect(screen.getByText('2 seat(s) selected')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: en.reservation.reserve })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: en.reservation.clearSelection })).toBeInTheDocument();
        });

        it('calls reserve with the selected seat ids on button click', async () => {
            const reserve = vi.fn().mockResolvedValue(undefined);
            stubReservation({ selectedSeatIds: new Set(['seat-A1', 'seat-A2']), reserve });
            render(<ReservationPanel />);

            await userEvent.click(screen.getByRole('button', { name: en.reservation.reserve }));

            expect(reserve).toHaveBeenCalledWith({ seatIds: expect.arrayContaining(['seat-A1', 'seat-A2']) });
        });

        it('calls clearSelection when the clear button is clicked', async () => {
            const clearSelection = vi.fn();
            stubReservation({ selectedSeatIds: new Set(['seat-A1']), clearSelection });
            render(<ReservationPanel />);

            await userEvent.click(screen.getByRole('button', { name: en.reservation.clearSelection }));

            expect(clearSelection).toHaveBeenCalled();
        });
    });

    describe('pending reservation state', () => {
        const pendingReservation = new Reservation(
            makeReservation({ id: 'res-1', status: ReservationStatus.PENDING, seatIds: ['seat-A1', 'seat-A2'] })
        );

        it('shows the countdown timer with confirm and cancel buttons', () => {
            stubReservation({
                activeReservation: pendingReservation,
                countdown: 300,
            });
            render(<ReservationPanel />);

            expect(screen.getByText(en.reservation.expiresIn)).toBeInTheDocument();
            expect(screen.getByText('05:00')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: en.reservation.confirm })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: en.reservation.cancel })).toBeInTheDocument();
        });

        it('shows the countdown as urgent when less than 60 seconds remain', () => {
            stubReservation({
                activeReservation: pendingReservation,
                countdown: 45,
            });
            render(<ReservationPanel />);

            const timerEl = screen.getByRole('complementary').querySelector('.reservation-panel__timer--urgent');
            expect(timerEl).toBeInTheDocument();
        });

        it('calls confirm with the reservation id when confirm is clicked', async () => {
            const confirm = vi.fn().mockResolvedValue(undefined);
            stubReservation({ activeReservation: pendingReservation, countdown: 300, confirm });
            render(<ReservationPanel />);

            await userEvent.click(screen.getByRole('button', { name: en.reservation.confirm }));

            expect(confirm).toHaveBeenCalledWith({ reservationId: 'res-1' });
        });

        it('renders seat chips by row + number label, not raw seat ids', () => {
            stubReservation({ activeReservation: pendingReservation, countdown: 300 });
            render(<ReservationPanel />);

            expect(screen.getByText('A1')).toBeInTheDocument();
            expect(screen.getByText('A2')).toBeInTheDocument();
            expect(screen.queryByText('seat-A1')).not.toBeInTheDocument();
        });

        it('calls cancel without a reservation id when cancel is clicked', async () => {
            const cancel = vi.fn().mockResolvedValue(undefined);
            stubReservation({ activeReservation: pendingReservation, countdown: 300, cancel });
            render(<ReservationPanel />);

            await userEvent.click(screen.getByRole('button', { name: en.reservation.cancel }));

            expect(cancel).toHaveBeenCalledWith({});
        });
    });

    describe('confirmed reservation state', () => {
        const confirmedReservation = new Reservation(
            makeReservation({
                id: 'res-2',
                status: ReservationStatus.CONFIRMED,
                seatIds: ['seat-A1'],
                expiresInSeconds: 0,
            })
        );

        it('shows a confirmed success message with the seat label and a cancel button', () => {
            stubReservation({ activeReservation: confirmedReservation });
            render(<ReservationPanel />);

            expect(screen.getByText(en.reservation.confirmed)).toBeInTheDocument();
            expect(screen.getByText('A1')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: en.reservation.confirm })).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: en.reservation.cancelBooking })).toBeInTheDocument();
        });

        it('calls cancel without a reservation id when the cancel booking button is clicked', async () => {
            const cancel = vi.fn().mockResolvedValue(undefined);
            stubReservation({ activeReservation: confirmedReservation, cancel });
            render(<ReservationPanel />);

            await userEvent.click(screen.getByRole('button', { name: en.reservation.cancelBooking }));

            expect(cancel).toHaveBeenCalledWith({});
        });
    });
});
