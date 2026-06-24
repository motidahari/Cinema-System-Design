import { SeatModel } from '../../seats/domain-model/seat';
import { SeatStatus } from '../../seats/enum/seat-status.enum';
import { SeatsUnavailableException } from '../exception/seats-unavailable.exception';
import { SeatsNotConsecutiveException } from '../exception/seats-not-consecutive.exception';
import { IsolatedSeatException } from '../exception/isolated-seat.exception';

/**
 * Core business logic for the two seat-selection rules. Both are pure, side-effect-free
 * static functions so they are fully unit-testable (TEST-STRATEGY §3.1).
 */
export class SeatSelectionValidator {
    /**
     * Rule 1: all seats must be in the same row and consecutive (no gaps).
     */
    static validateConsecutive(seats: SeatModel[]): void {
        if (seats.length === 0) throw new SeatsUnavailableException('No seats provided');

        const rows = new Set(seats.map((s) => s.row));
        if (rows.size > 1) {
            throw new SeatsNotConsecutiveException('Seats must be in the same row');
        }

        const numbers = seats.map((s) => s.number).sort((a, b) => a - b);
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] !== numbers[i - 1] + 1) {
                throw new SeatsNotConsecutiveException(
                    `Gap detected between seat ${numbers[i - 1]} and seat ${numbers[i]}`
                );
            }
        }
    }

    /**
     * Rule 2: after the selection, no single empty seat may be "trapped" between two
     * occupied seats (RESERVED / BOOKED / part of this selection). A remaining gap must
     * be 0 or >= 2. A single empty seat at the EDGE of a row (next to a wall) is allowed.
     *
     * BOUNDARY-ONLY inspection (DECISIONS.md ADR-3): Rule 1 already guarantees the
     * selection is one consecutive block [leftMost..rightMost] in a single row. The only
     * new trapping the current selection can introduce is immediately outside its two
     * ends, so we inspect exactly two positions — `leftMost - 1` and `rightMost + 1` —
     * instead of scanning the whole row. A whole-row scan would wrongly reject a valid
     * selection whenever an UNRELATED single gap was created earlier by an expiry.
     *
     * A boundary position p is "trapped" iff seat(p) is empty AND its OUTER neighbor is
     * occupied. Off-row positions (< first seat / > last seat) are walls → not occupied.
     *
     * @param rowSeats    All seats in the row (any order)
     * @param selectedIds The IDs of the seats being reserved (the consecutive block)
     */
    static validateNoIsolatedSeat(rowSeats: SeatModel[], selectedIds: Set<string>): void {
        const byNumber = new Map<number, SeatModel>(rowSeats.map((s) => [s.number, s]));
        const row = rowSeats[0]?.row ?? '?';

        const isOccupied = (n: number): boolean => {
            const seat = byNumber.get(n);
            if (!seat) return false; // off-row position = wall, never occupied
            return selectedIds.has(seat.id) || seat.status === SeatStatus.RESERVED || seat.status === SeatStatus.BOOKED;
        };
        const isEmpty = (n: number): boolean => byNumber.has(n) && !isOccupied(n);

        // Derive the selected block's bounds from the selection itself.
        const selectedNumbers = rowSeats.filter((s) => selectedIds.has(s.id)).map((s) => s.number);
        if (selectedNumbers.length === 0) return; // nothing selected in this row
        const leftMost = Math.min(...selectedNumbers);
        const rightMost = Math.max(...selectedNumbers);

        // Left boundary: position leftMost-1 trapped iff empty AND outer (leftMost-2) occupied
        const lb = leftMost - 1;
        if (isEmpty(lb) && isOccupied(lb - 1)) {
            throw new IsolatedSeatException(`Seat ${row}${lb} would be isolated after selection`);
        }

        // Right boundary: position rightMost+1 trapped iff empty AND outer (rightMost+2) occupied
        const rb = rightMost + 1;
        if (isEmpty(rb) && isOccupied(rb + 1)) {
            throw new IsolatedSeatException(`Seat ${row}${rb} would be isolated after selection`);
        }
    }
}
