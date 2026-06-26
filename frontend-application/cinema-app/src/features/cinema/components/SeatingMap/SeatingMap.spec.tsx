import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Seat } from '../../models/Seat';
import { makeSeat } from '@/test/factories';

vi.mock('@/features/auth/stores/useAuthStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('../../hooks/useSeats', () => ({ useSeats: vi.fn() }));
vi.mock('../../hooks/useReservation', () => ({ useReservation: vi.fn() }));
vi.mock('../../hooks/useSocket', () => ({ useSocket: vi.fn() }));

import SeatingMap from './SeatingMap';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useSeats } from '../../hooks/useSeats';
import { useReservation } from '../../hooks/useReservation';
import { useSocket } from '../../hooks/useSocket';

const useAuthStoreMock = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const useSeatsMock = useSeats as unknown as ReturnType<typeof vi.fn>;
const useReservationMock = useReservation as unknown as ReturnType<typeof vi.fn>;
const useSocketMock = useSocket as unknown as ReturnType<typeof vi.fn>;

const seatsByRow = {
    B: [new Seat(makeSeat({ id: 'seat-B1', row: 'B', number: 1 }))],
    A: [new Seat(makeSeat({ id: 'seat-A1', row: 'A', number: 1 }))],
};

function setHooks(
    overrides: { isLoading?: boolean; isAuthenticated?: boolean; activeReservation?: unknown } = {}
): void {
    useAuthStoreMock.mockImplementation((selector: (s: { isAuthenticated: boolean }) => unknown) =>
        selector({ isAuthenticated: overrides.isAuthenticated ?? true })
    );
    useSeatsMock.mockReturnValue({ seatsByRow, isLoading: overrides.isLoading ?? false });
    useReservationMock.mockReturnValue({
        selectedSeatIds: new Set<string>(),
        activeReservation: overrides.activeReservation ?? null,
        selectSeat: vi.fn(),
        deselectSeat: vi.fn(),
    });
}

describe('SeatingMap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setHooks();
    });

    it('shows a loading indicator while the map is loading', () => {
        setHooks({ isLoading: true });
        render(<SeatingMap />);

        expect(screen.getByLabelText('Loading seating map')).toBeInTheDocument();
        expect(screen.queryByText('SCREEN')).not.toBeInTheDocument();
    });

    it('renders the screen, the legend and one row per seat group', () => {
        render(<SeatingMap />);

        expect(screen.getByText('SCREEN')).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(2);
        ['Available', 'Selected', 'Reserved', 'Booked'].forEach((label) => {
            expect(screen.getByText(label)).toBeInTheDocument();
        });
    });

    it('renders rows in alphabetical order', () => {
        render(<SeatingMap />);

        const rowLabels = screen.getAllByRole('row').map((r) => r.getAttribute('aria-label'));
        expect(rowLabels).toEqual(['Row A', 'Row B']);
    });

    it('opens the realtime socket with the authentication state', () => {
        setHooks({ isAuthenticated: true });
        render(<SeatingMap />);

        expect(useSocketMock).toHaveBeenCalledWith(true);
    });

    it('keeps available seats interactive when there is no active reservation', () => {
        render(<SeatingMap />);

        expect(screen.getByRole('button', { name: /Row A Seat 1/ })).toBeEnabled();
    });

    it('locks every seat while the user holds an active reservation', () => {
        setHooks({ activeReservation: { id: 'res-1', isPending: true } });
        render(<SeatingMap />);

        screen.getAllByRole('button').forEach((seat) => expect(seat).toBeDisabled());
    });
});
