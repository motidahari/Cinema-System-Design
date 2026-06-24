import { ValidationException, isValidDate, isValidEnum, isValidUuid } from '@cinema/shared';
import { ReservationStatus } from '../enum/reservation-status.enum';

export interface ReservationModelAttrs {
    id: string;
    userId: string;
    status: ReservationStatus;
    expiresAt: Date;
    seatIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

export class ReservationModel {
    private _id!: string;
    private _userId!: string;
    private _status!: ReservationStatus;
    private _expiresAt!: Date;
    private _seatIds!: string[];
    private _createdAt!: Date;
    private _updatedAt!: Date;

    constructor(attrs: ReservationModelAttrs) {
        this.id = attrs.id;
        this.userId = attrs.userId;
        this.status = attrs.status;
        this.expiresAt = attrs.expiresAt;
        this.seatIds = attrs.seatIds;
        this.createdAt = attrs.createdAt;
        this.updatedAt = attrs.updatedAt;
    }

    get id(): string {
        return this._id;
    }
    set id(value: string) {
        if (!isValidUuid(value)) throw new ValidationException(`id must be a valid UUID, received: "${value}"`);
        this._id = value;
    }

    get userId(): string {
        return this._userId;
    }
    set userId(value: string) {
        if (!isValidUuid(value)) throw new ValidationException(`userId must be a valid UUID, received: "${value}"`);
        this._userId = value;
    }

    get status(): ReservationStatus {
        return this._status;
    }
    set status(value: ReservationStatus) {
        if (!isValidEnum(value, ReservationStatus))
            throw new ValidationException(`status must be a valid ReservationStatus, received: "${value}"`);
        this._status = value;
    }

    get expiresAt(): Date {
        return this._expiresAt;
    }
    set expiresAt(value: Date) {
        if (!isValidDate(value))
            throw new ValidationException(`expiresAt must be a valid Date, received: ${String(value)}`);
        this._expiresAt = value;
    }

    get seatIds(): string[] {
        return this._seatIds;
    }
    set seatIds(value: string[]) {
        if (!Array.isArray(value) || !value.every((id) => isValidUuid(id)))
            throw new ValidationException('seatIds must be an array of valid UUIDs');
        this._seatIds = value;
    }

    get createdAt(): Date {
        return this._createdAt;
    }
    set createdAt(value: Date) {
        if (!isValidDate(value))
            throw new ValidationException(`createdAt must be a valid Date, received: ${String(value)}`);
        this._createdAt = value;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }
    set updatedAt(value: Date) {
        if (!isValidDate(value))
            throw new ValidationException(`updatedAt must be a valid Date, received: ${String(value)}`);
        this._updatedAt = value;
    }

    // ── State queries ────────────────────────────────────────────────────────
    isExpired(): boolean {
        return Date.now() > this._expiresAt.getTime();
    }
    isPending(): boolean {
        return this._status === ReservationStatus.PENDING;
    }
    isConfirmed(): boolean {
        return this._status === ReservationStatus.CONFIRMED;
    }
    isOwnedBy(userId: string): boolean {
        return this._userId === userId;
    }
    expiresInSeconds(): number {
        return Math.max(0, Math.floor((this._expiresAt.getTime() - Date.now()) / 1000));
    }

    // ── State transitions ────────────────────────────────────────────────────
    confirm(): void {
        this._status = ReservationStatus.CONFIRMED;
    }
    cancel(): void {
        this._status = ReservationStatus.CANCELLED;
    }
    expire(): void {
        this._status = ReservationStatus.EXPIRED;
    }

    toJSON() {
        return {
            id: this.id,
            status: this.status,
            expiresAt: this.expiresAt.toISOString(),
            expiresInSeconds: this.expiresInSeconds(),
            seatIds: this.seatIds,
        };
    }
}
