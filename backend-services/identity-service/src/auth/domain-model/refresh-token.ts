import { ValidationException, isValidDate, isValidString } from '@cinema/internal-sdk';

export class RefreshTokenModel {
    private _id!: string;
    private _userId!: string;
    private _familyId!: string;
    private _tokenHash!: string;
    private _expiresAt!: Date;
    private _revokedAt: Date | null = null;
    private _replacedBy: string | null = null;
    private _userAgent: string | null = null;
    private _ip: string | null = null;
    private _createdAt!: Date;

    constructor(attrs: Partial<RefreshTokenModel>) {
        this.id = attrs.id;
        this.userId = attrs.userId;
        this.familyId = attrs.familyId;
        this.tokenHash = attrs.tokenHash;
        this.expiresAt = attrs.expiresAt;
        this.revokedAt = attrs.revokedAt;
        this.replacedBy = attrs.replacedBy;
        this.userAgent = attrs.userAgent;
        this.ip = attrs.ip;
        this.createdAt = attrs.createdAt;
    }

    get id(): string {
        return this._id;
    }
    set id(value: string | undefined) {
        if (!isValidString(value, { optional: true }))
            throw new ValidationException(`id must be a non-empty string, received: "${value}"`);
        if (value !== undefined) this._id = value;
    }

    get userId(): string {
        return this._userId;
    }
    set userId(value: string | undefined) {
        if (!isValidString(value, { optional: true }))
            throw new ValidationException(`userId must be a non-empty string, received: "${value}"`);
        if (value !== undefined) this._userId = value;
    }

    get familyId(): string {
        return this._familyId;
    }
    set familyId(value: string | undefined) {
        if (!isValidString(value, { optional: true }))
            throw new ValidationException(`familyId must be a non-empty string, received: "${value}"`);
        if (value !== undefined) this._familyId = value;
    }

    get tokenHash(): string {
        return this._tokenHash;
    }
    set tokenHash(value: string | undefined) {
        if (!isValidString(value, { optional: true, min: 64, max: 64 }))
            throw new ValidationException(
                `tokenHash must be a 64-char hex string, received length: ${typeof value === 'string' ? value.length : value}`
            );
        if (value !== undefined) this._tokenHash = value;
    }

    get expiresAt(): Date {
        return this._expiresAt;
    }
    set expiresAt(value: Date | undefined) {
        if (!isValidDate(value, { optional: true }))
            throw new ValidationException(`expiresAt must be a valid Date, received: ${String(value)}`);
        if (value !== undefined) this._expiresAt = value;
    }

    get revokedAt(): Date | null {
        return this._revokedAt;
    }
    set revokedAt(value: Date | null | undefined) {
        if (!isValidDate(value, { optional: true, nullable: true }))
            throw new ValidationException(`revokedAt must be a valid Date or null, received: ${String(value)}`);
        if (value !== undefined) this._revokedAt = value;
    }

    get replacedBy(): string | null {
        return this._replacedBy;
    }
    set replacedBy(value: string | null | undefined) {
        if (!isValidString(value, { optional: true, nullable: true }))
            throw new ValidationException(`replacedBy must be a non-empty string or null, received: "${value}"`);
        if (value !== undefined) this._replacedBy = value;
    }

    get userAgent(): string | null {
        return this._userAgent;
    }
    set userAgent(value: string | null | undefined) {
        if (value === undefined) return;
        this._userAgent = value;
    }

    get ip(): string | null {
        return this._ip;
    }
    set ip(value: string | null | undefined) {
        if (value === undefined) return;
        this._ip = value;
    }

    get createdAt(): Date {
        return this._createdAt;
    }
    set createdAt(value: Date | undefined) {
        if (!isValidDate(value, { optional: true }))
            throw new ValidationException(`createdAt must be a valid Date, received: ${String(value)}`);
        if (value !== undefined) this._createdAt = value;
    }

    isExpired(): boolean {
        return this._expiresAt < new Date();
    }

    isRevoked(): boolean {
        return this._revokedAt !== null;
    }
}
