// Models
import type { Seat } from '../../models/Seat';

// Components
import SeatButton from '../SeatButton';

export interface SeatGridProps {
    row: string;
    seats: Seat[];
    selectedSeatIds: Set<string>;
    onSeatSelect: (seatId: string) => void;
    onSeatDeselect: (seatId: string) => void;
}

export default function SeatGrid({ row, seats, selectedSeatIds, onSeatSelect, onSeatDeselect }: SeatGridProps) {
    const orderedSeats = [...seats].sort((a, b) => a.number - b.number);

    return (
        <div className="seating-map__row" role="row" aria-label={`Row ${row}`}>
            <span className="seating-map__row-label">{row}</span>
            {orderedSeats.map((seat) => (
                <SeatButton
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatIds.has(seat.id)}
                    onSelect={onSeatSelect}
                    onDeselect={onSeatDeselect}
                />
            ))}
        </div>
    );
}
