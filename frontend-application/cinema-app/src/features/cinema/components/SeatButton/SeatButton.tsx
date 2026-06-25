// Models
import type { Seat } from '../../models/Seat';

export interface SeatButtonProps {
    seat: Seat;
    isSelected: boolean;
    onSelect: (seatId: string) => void;
    onDeselect: (seatId: string) => void;
}

// A single seat in the grid (FRONTEND-DESIGN §7.2). Presentational: it derives its
// visual state from the seat's status + the `isSelected` flag and reports clicks up via
// onSelect/onDeselect. Only AVAILABLE seats (or an already-selected one, so it can be
// toggled off) are interactable; RESERVED/BOOKED seats render disabled.
export default function SeatButton({ seat, isSelected, onSelect, onDeselect }: SeatButtonProps) {
    const isInteractable = seat.isAvailable || isSelected;

    // Selected wins over the underlying status; otherwise the BEM modifier mirrors the
    // status ('available' | 'reserved' | 'booked').
    const modifier = isSelected ? 'selected' : seat.status.toLowerCase();

    const handleClick = (): void => {
        if (!isInteractable) return;
        if (isSelected) {
            onDeselect(seat.id);
        } else {
            onSelect(seat.id);
        }
    };

    return (
        <button
            type="button"
            className={`seating-map__seat seating-map__seat--${modifier}`}
            onClick={handleClick}
            disabled={!isInteractable}
            aria-pressed={isSelected}
            aria-label={`Row ${seat.row} Seat ${seat.number} — ${modifier}`}
            title={seat.label}
        >
            {seat.number}
        </button>
    );
}
