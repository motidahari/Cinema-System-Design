import { randomUUID } from 'crypto';
import { SeatSelectionValidator } from '../../src/reservations/validation/seat-selection.validator';
import { SeatModel } from '../../src/seats/domain-model/seat';
import { SeatStatus } from '../../src/seats/enum/seat-status.enum';
import { SeatsUnavailableException } from '../../src/reservations/exception/seats-unavailable.exception';
import { SeatsNotConsecutiveException } from '../../src/reservations/exception/seats-not-consecutive.exception';
import { IsolatedSeatException } from '../../src/reservations/exception/isolated-seat.exception';

// ── Helpers ──────────────────────────────────────────────────────────────────
// SeatModel validates `id` as a UUID, so we keep a stable (row,number) → UUID
// registry shared by makeSeat/buildRow and seatId so selection ids always match.

const idRegistry = new Map<string, string>();

function seatId(row: string, number: number): string {
    const key = `${row}${number}`;
    if (!idRegistry.has(key)) idRegistry.set(key, randomUUID());
    return idRegistry.get(key)!;
}

function makeSeat(row: string, number: number, status: SeatStatus = SeatStatus.AVAILABLE): SeatModel {
    return new SeatModel({
        id: seatId(row, number),
        row,
        number,
        status,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
}

function buildRow(row: string, count: number, overrides: Record<number, SeatStatus>): SeatModel[] {
    return Array.from({ length: count }, (_, i) => {
        const number = i + 1;
        return makeSeat(row, number, overrides[number] ?? SeatStatus.AVAILABLE);
    });
}

function selection(row: string, numbers: number[]): Set<string> {
    return new Set(numbers.map((n) => seatId(row, n)));
}

describe('SeatSelectionValidator', () => {
    // ── Rule 1: Consecutive ──────────────────────────────────────────────────
    describe('validateConsecutive, Given:Mixed-row selection, When:Validating', () => {
        it('should throw SeatsNotConsecutiveException', () => {
            const seats = [makeSeat('A', 1), makeSeat('B', 2)];
            expect(() => SeatSelectionValidator.validateConsecutive(seats)).toThrow(SeatsNotConsecutiveException);
            expect(() => SeatSelectionValidator.validateConsecutive(seats)).toThrow('Seats must be in the same row');
        });
    });

    describe('validateConsecutive, Given:Same row with a gap, When:Validating', () => {
        it('should throw for a gap between seat 5 and seat 7', () => {
            const seats = [makeSeat('A', 5), makeSeat('A', 7)];
            expect(() => SeatSelectionValidator.validateConsecutive(seats)).toThrow(SeatsNotConsecutiveException);
            expect(() => SeatSelectionValidator.validateConsecutive(seats)).toThrow(
                'Gap detected between seat 5 and seat 7'
            );
        });
    });

    describe('validateConsecutive, Given:Same row no gaps, When:Validating', () => {
        it('should not throw for seats 3-4-5', () => {
            const seats = [makeSeat('A', 3), makeSeat('A', 4), makeSeat('A', 5)];
            expect(() => SeatSelectionValidator.validateConsecutive(seats)).not.toThrow();
        });

        it('should not throw when the seats arrive out of order', () => {
            const seats = [makeSeat('A', 5), makeSeat('A', 3), makeSeat('A', 4)];
            expect(() => SeatSelectionValidator.validateConsecutive(seats)).not.toThrow();
        });
    });

    describe('validateConsecutive, Given:Single seat, When:Validating', () => {
        it('should not throw for a single-seat selection', () => {
            expect(() => SeatSelectionValidator.validateConsecutive([makeSeat('C', 7)])).not.toThrow();
        });
    });

    describe('validateConsecutive, Given:Empty selection, When:Validating', () => {
        it('should throw SeatsUnavailableException', () => {
            expect(() => SeatSelectionValidator.validateConsecutive([])).toThrow(SeatsUnavailableException);
        });
    });

    // ── Rule 2: No isolated seat (boundary-only, ADR-3) ───────────────────────
    describe('validateNoIsolatedSeat, Given:# # * * . . . . . ., When:Validating', () => {
        it('should not throw — selecting 3,4 next to booked 1,2 (spec example ✅)', () => {
            const allSeats = buildRow('A', 10, { 1: SeatStatus.BOOKED, 2: SeatStatus.BOOKED });
            const selectedIds = selection('A', [3, 4]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).not.toThrow();
        });
    });

    describe('validateNoIsolatedSeat, Given:# # . * * . . . . ., When:Validating', () => {
        it('should throw — seat 3 trapped between booked 2 and selected 4 (spec example ❌)', () => {
            const allSeats = buildRow('A', 10, { 1: SeatStatus.BOOKED, 2: SeatStatus.BOOKED });
            const selectedIds = selection('A', [4, 5]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).toThrow(
                IsolatedSeatException
            );
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).toThrow(
                'Seat A3 would be isolated after selection'
            );
        });
    });

    describe('validateNoIsolatedSeat, Given:. * * * * * * * * *, When:Validating', () => {
        it('should not throw — seat 1 left alone at the edge (spec example ✅)', () => {
            const allSeats = buildRow('A', 10, {});
            const selectedIds = selection('A', [2, 3, 4, 5, 6, 7, 8, 9, 10]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).not.toThrow();
        });
    });

    describe('validateNoIsolatedSeat, Given:* * * * * * * * * ., When:Validating', () => {
        it('should not throw — seat 10 left alone at the right edge', () => {
            const allSeats = buildRow('A', 10, {});
            const selectedIds = selection('A', [1, 2, 3, 4, 5, 6, 7, 8, 9]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).not.toThrow();
        });
    });

    describe('validateNoIsolatedSeat, Given:Selection traps a seat against a reserved seat, When:Validating', () => {
        it('should throw — seat 4 trapped between selected 3 and reserved 5', () => {
            const allSeats = buildRow('A', 10, { 5: SeatStatus.RESERVED });
            const selectedIds = selection('A', [1, 2, 3]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).toThrow(
                IsolatedSeatException
            );
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).toThrow(
                'Seat A4 would be isolated after selection'
            );
        });
    });

    describe('validateNoIsolatedSeat, Given:A remaining gap of two or more, When:Validating', () => {
        it('should not throw — selecting 4,5 leaves seats 1-3 open (gap >= 2)', () => {
            const allSeats = buildRow('A', 10, {});
            const selectedIds = selection('A', [4, 5]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).not.toThrow();
        });
    });

    describe('validateNoIsolatedSeat, Given:An unrelated pre-existing single gap, When:Validating', () => {
        it('should not throw — boundary-only never false-positives on an unrelated gap', () => {
            // Seats 8 and 10 are RESERVED leaving seat 9 already trapped (e.g. from an
            // earlier expiry). A new selection at the far end (1,2) must still be allowed.
            const allSeats = buildRow('A', 10, { 8: SeatStatus.RESERVED, 10: SeatStatus.RESERVED });
            const selectedIds = selection('A', [1, 2]);
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, selectedIds)).not.toThrow();
        });
    });

    describe('validateNoIsolatedSeat, Given:Nothing selected in the row, When:Validating', () => {
        it('should not throw — no new trapping can be introduced (ADR-3)', () => {
            const allSeats = buildRow('A', 10, { 3: SeatStatus.RESERVED, 5: SeatStatus.RESERVED });
            expect(() => SeatSelectionValidator.validateNoIsolatedSeat(allSeats, new Set<string>())).not.toThrow();
        });
    });
});
