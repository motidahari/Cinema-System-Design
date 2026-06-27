import type { Seat } from '../../models/Seat';

export interface SeatButtonProps {
    seat: Seat;
    isSelected: boolean;
    locked?: boolean;
    onSelect: (seatId: string) => void;
    onDeselect: (seatId: string) => void;
}

// Presentational seat button: derives visual state from seat.status + isSelected flag.
// Only AVAILABLE seats (or an already-selected one) are interactable — RESERVED/BOOKED
// render disabled so they cannot be toggled. When `locked` (the user already holds an
// active reservation), every seat is non-interactable so no new selection can start.
export default function SeatButton({ seat, isSelected, locked = false, onSelect, onDeselect }: SeatButtonProps) {
    const isInteractable = (seat.isAvailable || isSelected) && !locked;
    // 'selected' wins over the underlying status for the BEM modifier.
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
