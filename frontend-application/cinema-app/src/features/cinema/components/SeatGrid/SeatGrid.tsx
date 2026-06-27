import type { Seat } from '../../models/Seat';
import SeatButton from '../SeatButton';

export interface SeatGridProps {
    row: string;
    seats: Seat[];
    selectedSeatIds: Set<string>;
    locked?: boolean;
    onSeatSelect: (seatId: string) => void;
    onSeatDeselect: (seatId: string) => void;
}

export default function SeatGrid({
    row,
    seats,
    selectedSeatIds,
    locked = false,
    onSeatSelect,
    onSeatDeselect,
}: SeatGridProps) {
    const orderedSeats = [...seats].sort((a, b) => a.number - b.number);

    return (
        <div className="seating-map__row" role="row" aria-label={`Row ${row}`}>
            <span className="seating-map__row-label">{row}</span>
            {orderedSeats.map((seat) => (
                <SeatButton
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatIds.has(seat.id)}
                    locked={locked}
                    onSelect={onSeatSelect}
                    onDeselect={onSeatDeselect}
                />
            ))}
        </div>
    );
}
