import { ValidationException } from '@cinema/shared';
import { randomUUID } from 'crypto';
import { ReservationSeatModel, ReservationSeatModelAttrs } from '../../src/reservations/domain-model/reservation-seat';

const validAttrs: ReservationSeatModelAttrs = {
    id: randomUUID(),
    reservationId: randomUUID(),
    seatId: randomUUID(),
    isActive: true,
};

describe('ReservationSeatModel', () => {
    describe('constructor, Given:Valid attrs, When:Constructing', () => {
        it('should expose all properties correctly', () => {
            const rs = new ReservationSeatModel(validAttrs);
            expect(rs.id).toBe(validAttrs.id);
            expect(rs.reservationId).toBe(validAttrs.reservationId);
            expect(rs.seatId).toBe(validAttrs.seatId);
            expect(rs.isActive).toBe(true);
        });
    });

    describe('constructor, Given:A non-UUID identifier, When:Constructing', () => {
        it('should throw for an invalid id', () => {
            expect(() => new ReservationSeatModel({ ...validAttrs, id: 'nope' })).toThrow(ValidationException);
        });

        it('should throw for an invalid reservationId', () => {
            expect(() => new ReservationSeatModel({ ...validAttrs, reservationId: 'nope' })).toThrow(
                ValidationException
            );
        });

        it('should throw for an invalid seatId', () => {
            expect(() => new ReservationSeatModel({ ...validAttrs, seatId: 'nope' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:A non-boolean isActive, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new ReservationSeatModel({ ...validAttrs, isActive: 'yes' as unknown as boolean })).toThrow(
                ValidationException
            );
        });
    });

    describe('toJSON, Given:A join row, When:Serializing', () => {
        it('should expose id, reservationId, seatId and isActive', () => {
            const rs = new ReservationSeatModel({ ...validAttrs, isActive: false });
            expect(rs.toJSON()).toEqual({
                id: validAttrs.id,
                reservationId: validAttrs.reservationId,
                seatId: validAttrs.seatId,
                isActive: false,
            });
        });
    });
});
