import { ValidationException, isValidBoolean, isValidUuid } from '@cinema/shared';

export interface ReservationSeatModelAttrs {
    id: string;
    reservationId: string;
    seatId: string;
    isActive: boolean;
}

/**
 * A join row linking a reservation to a held seat. `isActive` is true while the
 * reservation currently holds the seat (RESERVED or BOOKED) — the DB-level
 * anti-double-booking backstop (DATABASE-DESIGN §4.4, DECISIONS ADR-9).
 */
export class ReservationSeatModel {
    private _id!: string;
    private _reservationId!: string;
    private _seatId!: string;
    private _isActive!: boolean;

    constructor(attrs: ReservationSeatModelAttrs) {
        this.id = attrs.id;
        this.reservationId = attrs.reservationId;
        this.seatId = attrs.seatId;
        this.isActive = attrs.isActive;
    }

    get id(): string {
        return this._id;
    }
    set id(value: string) {
        if (!isValidUuid(value)) throw new ValidationException(`id must be a valid UUID, received: "${value}"`);
        this._id = value;
    }

    get reservationId(): string {
        return this._reservationId;
    }
    set reservationId(value: string) {
        if (!isValidUuid(value))
            throw new ValidationException(`reservationId must be a valid UUID, received: "${value}"`);
        this._reservationId = value;
    }

    get seatId(): string {
        return this._seatId;
    }
    set seatId(value: string) {
        if (!isValidUuid(value)) throw new ValidationException(`seatId must be a valid UUID, received: "${value}"`);
        this._seatId = value;
    }

    get isActive(): boolean {
        return this._isActive;
    }
    set isActive(value: boolean) {
        if (!isValidBoolean(value))
            throw new ValidationException(`isActive must be a boolean, received: ${String(value)}`);
        this._isActive = value;
    }

    toJSON() {
        return {
            id: this._id,
            reservationId: this._reservationId,
            seatId: this._seatId,
            isActive: this._isActive,
        };
    }
}
