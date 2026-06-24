import { ValidationException } from '@cinema/shared';
import { randomUUID } from 'crypto';
import { ReservationModel, ReservationModelAttrs } from '../../src/reservations/domain-model/reservation';
import { ReservationStatus } from '../../src/reservations/enum/reservation-status.enum';

const makeAttrs = (overrides: Partial<ReservationModelAttrs> = {}): ReservationModelAttrs => ({
    id: randomUUID(),
    userId: randomUUID(),
    status: ReservationStatus.PENDING,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    seatIds: [randomUUID(), randomUUID()],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
});

describe('ReservationModel', () => {
    describe('constructor, Given:Valid attrs, When:Constructing', () => {
        it('should expose all properties correctly', () => {
            const attrs = makeAttrs();
            const reservation = new ReservationModel(attrs);

            expect(reservation.id).toBe(attrs.id);
            expect(reservation.userId).toBe(attrs.userId);
            expect(reservation.status).toBe(ReservationStatus.PENDING);
            expect(reservation.expiresAt).toBe(attrs.expiresAt);
            expect(reservation.seatIds).toEqual(attrs.seatIds);
            expect(reservation.createdAt).toBe(attrs.createdAt);
            expect(reservation.updatedAt).toBe(attrs.updatedAt);
        });
    });

    describe('constructor, Given:Invalid attrs, When:Constructing', () => {
        it('should throw for a non-UUID id', () => {
            expect(() => new ReservationModel(makeAttrs({ id: 'not-a-uuid' }))).toThrow(ValidationException);
        });

        it('should throw for a non-UUID userId', () => {
            expect(() => new ReservationModel(makeAttrs({ userId: 'nope' }))).toThrow(ValidationException);
        });

        it('should throw for an invalid status', () => {
            expect(() => new ReservationModel(makeAttrs({ status: 'PURPLE' as ReservationStatus }))).toThrow(
                ValidationException
            );
        });

        it('should throw for an invalid expiresAt', () => {
            expect(() => new ReservationModel(makeAttrs({ expiresAt: new Date('invalid') }))).toThrow(
                ValidationException
            );
        });

        it('should throw when seatIds contains a non-UUID', () => {
            expect(() => new ReservationModel(makeAttrs({ seatIds: [randomUUID(), 'bad'] }))).toThrow(
                ValidationException
            );
        });

        it('should accept an empty seatIds array', () => {
            expect(() => new ReservationModel(makeAttrs({ seatIds: [] }))).not.toThrow();
        });
    });

    describe('state queries, Given:A reservation, When:Inspecting state', () => {
        it('isPending/isConfirmed should reflect the status', () => {
            expect(new ReservationModel(makeAttrs({ status: ReservationStatus.PENDING })).isPending()).toBe(true);
            expect(new ReservationModel(makeAttrs({ status: ReservationStatus.CONFIRMED })).isConfirmed()).toBe(true);
            expect(new ReservationModel(makeAttrs({ status: ReservationStatus.PENDING })).isConfirmed()).toBe(false);
        });

        it('isExpired should be false for a future expiry and true for a past one', () => {
            expect(new ReservationModel(makeAttrs({ expiresAt: new Date(Date.now() + 60_000) })).isExpired()).toBe(
                false
            );
            expect(new ReservationModel(makeAttrs({ expiresAt: new Date(Date.now() - 60_000) })).isExpired()).toBe(
                true
            );
        });

        it('isOwnedBy should match only the owning user', () => {
            const userId = randomUUID();
            const reservation = new ReservationModel(makeAttrs({ userId }));
            expect(reservation.isOwnedBy(userId)).toBe(true);
            expect(reservation.isOwnedBy(randomUUID())).toBe(false);
        });

        it('expiresInSeconds should be ~remaining seconds, never negative', () => {
            const future = new ReservationModel(makeAttrs({ expiresAt: new Date(Date.now() + 600_000) }));
            expect(future.expiresInSeconds()).toBeGreaterThan(595);
            expect(future.expiresInSeconds()).toBeLessThanOrEqual(600);

            const past = new ReservationModel(makeAttrs({ expiresAt: new Date(Date.now() - 60_000) }));
            expect(past.expiresInSeconds()).toBe(0);
        });
    });

    describe('state transitions, Given:A pending reservation, When:Transitioning', () => {
        it('confirm/cancel/expire should set the corresponding status', () => {
            const confirmed = new ReservationModel(makeAttrs());
            confirmed.confirm();
            expect(confirmed.status).toBe(ReservationStatus.CONFIRMED);

            const cancelled = new ReservationModel(makeAttrs());
            cancelled.cancel();
            expect(cancelled.status).toBe(ReservationStatus.CANCELLED);

            const expired = new ReservationModel(makeAttrs());
            expired.expire();
            expect(expired.status).toBe(ReservationStatus.EXPIRED);
        });
    });

    describe('toJSON, Given:A reservation, When:Serializing', () => {
        it('should expose id, status, ISO expiresAt, expiresInSeconds and seatIds (no userId)', () => {
            const attrs = makeAttrs({ expiresAt: new Date(Date.now() + 300_000) });
            const json = new ReservationModel(attrs).toJSON();

            expect(Object.keys(json).sort()).toEqual(['expiresAt', 'expiresInSeconds', 'id', 'seatIds', 'status']);
            expect(json.id).toBe(attrs.id);
            expect(json.status).toBe(ReservationStatus.PENDING);
            expect(json.expiresAt).toBe(attrs.expiresAt.toISOString());
            expect(json.seatIds).toEqual(attrs.seatIds);
            expect(json.expiresInSeconds).toBeGreaterThan(0);
        });
    });
});
