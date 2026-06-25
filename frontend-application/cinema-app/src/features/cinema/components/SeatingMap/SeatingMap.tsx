// MUI
import { Chip, CircularProgress } from '@mui/material';

// Stores & hooks
import { useAuthStore } from '@/features/auth/stores/useAuthStore';
import { useSeats } from '../../hooks/useSeats';
import { useReservation } from '../../hooks/useReservation';
import { useSocket } from '../../hooks/useSocket';

// Components
import SeatGrid from '../SeatGrid';

// The seating-map container (FRONTEND-DESIGN §7.1): the screen banner, one SeatGrid per
// row (A–M, sorted), and a status legend. Seat data + selection come from the cinema /
// reservation hooks; useSocket keeps the map live while authenticated. Purely a
// composition layer — all state lives in the stores.
export default function SeatingMap() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { seatsByRow, isLoading } = useSeats();
    const { selectedSeatIds, selectSeat, deselectSeat } = useReservation();

    // Connect to Socket.io when authenticated (the cookie rides the upgrade).
    useSocket(isAuthenticated);

    if (isLoading) {
        return <CircularProgress aria-label="Loading seating map" />;
    }

    const rows = Object.keys(seatsByRow).sort();

    return (
        <div className="seating-map">
            <div className="seating-map__screen">SCREEN</div>

            {rows.map((row) => (
                <SeatGrid
                    key={row}
                    row={row}
                    seats={seatsByRow[row]}
                    selectedSeatIds={selectedSeatIds}
                    onSeatSelect={selectSeat}
                    onSeatDeselect={deselectSeat}
                />
            ))}

            <div className="seating-map__legend">
                <Chip label="Available" className="seating-map__legend-chip--available" />
                <Chip label="Selected" className="seating-map__legend-chip--selected" />
                <Chip label="Reserved" className="seating-map__legend-chip--reserved" />
                <Chip label="Booked" className="seating-map__legend-chip--booked" />
            </div>
        </div>
    );
}
