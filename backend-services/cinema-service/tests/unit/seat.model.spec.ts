import { ValidationException } from '@cinema/shared';
import { randomUUID } from 'crypto';
import { SeatModel, SeatModelAttrs } from '../../src/seats/domain-model/seat';
import { SeatStatus } from '../../src/seats/enum/seat-status.enum';

const validAttrs: SeatModelAttrs = {
    id: randomUUID(),
    row: 'A',
    number: 5,
    status: SeatStatus.AVAILABLE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('SeatModel', () => {
    describe('constructor, Given:Valid attrs, When:Constructing', () => {
        it('should expose all properties correctly', () => {
            const seat = new SeatModel(validAttrs);
            expect(seat.id).toBe(validAttrs.id);
            expect(seat.row).toBe('A');
            expect(seat.number).toBe(5);
            expect(seat.status).toBe(SeatStatus.AVAILABLE);
            expect(seat.createdAt).toBe(validAttrs.createdAt);
            expect(seat.updatedAt).toBe(validAttrs.updatedAt);
        });

        it('should accept seat number 10 for a Section A row', () => {
            expect(() => new SeatModel({ ...validAttrs, row: 'J', number: 10 })).not.toThrow();
        });

        it('should accept seat number 5 for a Section B row', () => {
            expect(() => new SeatModel({ ...validAttrs, row: 'M', number: 5 })).not.toThrow();
        });
    });

    describe('constructor, Given:Non-UUID id, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new SeatModel({ ...validAttrs, id: 'not-a-uuid' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Row outside A–M, When:Constructing', () => {
        it('should throw ValidationException for "N"', () => {
            expect(() => new SeatModel({ ...validAttrs, row: 'N' })).toThrow(ValidationException);
        });

        it('should throw ValidationException for a lowercase row', () => {
            expect(() => new SeatModel({ ...validAttrs, row: 'a' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Out-of-range seat number, When:Constructing', () => {
        it('should throw for number 11 in Section A (max 10)', () => {
            expect(() => new SeatModel({ ...validAttrs, row: 'A', number: 11 })).toThrow(ValidationException);
        });

        it('should throw for number 6 in Section B (max 5)', () => {
            expect(() => new SeatModel({ ...validAttrs, row: 'K', number: 6 })).toThrow(ValidationException);
        });

        it('should throw for number 0', () => {
            expect(() => new SeatModel({ ...validAttrs, number: 0 })).toThrow(ValidationException);
        });

        it('should throw for a non-integer number', () => {
            expect(() => new SeatModel({ ...validAttrs, number: 2.5 })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Invalid status, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new SeatModel({ ...validAttrs, status: 'PURPLE' as SeatStatus })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Invalid dates, When:Constructing', () => {
        it('should throw for an invalid createdAt', () => {
            expect(() => new SeatModel({ ...validAttrs, createdAt: new Date('invalid') })).toThrow(ValidationException);
        });

        it('should throw for an invalid updatedAt', () => {
            expect(() => new SeatModel({ ...validAttrs, updatedAt: new Date('invalid') })).toThrow(ValidationException);
        });
    });

    describe('isAvailable, Given:Seats of each status, When:Checking availability', () => {
        it('should return true only for AVAILABLE seats', () => {
            expect(new SeatModel({ ...validAttrs, status: SeatStatus.AVAILABLE }).isAvailable()).toBe(true);
            expect(new SeatModel({ ...validAttrs, status: SeatStatus.RESERVED }).isAvailable()).toBe(false);
            expect(new SeatModel({ ...validAttrs, status: SeatStatus.BOOKED }).isAvailable()).toBe(false);
        });
    });

    describe('toJSON, Given:A seat, When:Serializing', () => {
        it('should expose only id, row, number and status', () => {
            const seat = new SeatModel(validAttrs);
            expect(seat.toJSON()).toEqual({
                id: validAttrs.id,
                row: 'A',
                number: 5,
                status: SeatStatus.AVAILABLE,
            });
        });
    });

    describe('static row sets, Given:The model, When:Inspecting valid rows', () => {
        it('should expose 13 valid rows split across two sections', () => {
            expect(SeatModel.SECTION_A_ROWS).toHaveLength(10);
            expect(SeatModel.SECTION_B_ROWS).toHaveLength(3);
            expect(SeatModel.VALID_ROWS).toHaveLength(13);
        });
    });
});
