import { ValidationException, isValidDate, isValidEnum, isValidUuid } from '@cinema/shared';
import { SeatStatus } from '../enum/seat-status.enum';

export interface SeatModelAttrs {
    id: string;
    row: string;
    number: number;
    status: SeatStatus;
    createdAt: Date;
    updatedAt: Date;
}

const SECTION_A_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
const SECTION_B_ROWS = ['K', 'L', 'M'] as const;

export class SeatModel {
    static readonly SECTION_A_ROWS: readonly string[] = SECTION_A_ROWS;
    static readonly SECTION_B_ROWS: readonly string[] = SECTION_B_ROWS;
    static readonly VALID_ROWS: readonly string[] = [...SECTION_A_ROWS, ...SECTION_B_ROWS];

    private _id!: string;
    private _row!: string;
    private _number!: number;
    private _status!: SeatStatus;
    private _createdAt!: Date;
    private _updatedAt!: Date;

    constructor(attrs: SeatModelAttrs) {
        this.id = attrs.id;
        this.row = attrs.row;
        this.number = attrs.number;
        this.status = attrs.status;
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

    get row(): string {
        return this._row;
    }
    set row(value: string) {
        if (!SeatModel.VALID_ROWS.includes(value))
            throw new ValidationException(`row must be one of A–M, received: "${value}"`);
        this._row = value;
    }

    get number(): number {
        return this._number;
    }
    set number(value: number) {
        // `row` is always set before `number` in the constructor, so the section is known here.
        const maxSeat = SeatModel.SECTION_A_ROWS.includes(this._row) ? 10 : 5;
        if (!Number.isInteger(value) || value < 1 || value > maxSeat)
            throw new ValidationException(
                `number must be an integer 1–${maxSeat} for row ${this._row}, received: ${value}`
            );
        this._number = value;
    }

    get status(): SeatStatus {
        return this._status;
    }
    set status(value: SeatStatus) {
        if (!isValidEnum(value, SeatStatus))
            throw new ValidationException(`status must be a valid SeatStatus, received: "${value}"`);
        this._status = value;
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

    isAvailable(): boolean {
        return this._status === SeatStatus.AVAILABLE;
    }

    toJSON() {
        return {
            id: this.id,
            row: this.row,
            number: this.number,
            status: this.status,
        };
    }
}
