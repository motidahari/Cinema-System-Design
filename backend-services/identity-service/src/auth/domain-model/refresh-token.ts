import { ValidationException } from '@cinema/internal-sdk';

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
        if (value === undefined) return;
        if (typeof value !== 'string' || value.trim().length === 0)
            throw new ValidationException('RefreshToken id must be a non-empty string');
        this._id = value;
    }

    get userId(): string {
        return this._userId;
    }
    set userId(value: string | undefined) {
        if (value === undefined) return;
        if (typeof value !== 'string' || value.trim().length === 0)
            throw new ValidationException('RefreshToken userId must be a non-empty string');
        this._userId = value;
    }

    get familyId(): string {
        return this._familyId;
    }
    set familyId(value: string | undefined) {
        if (value === undefined) return;
        if (typeof value !== 'string' || value.trim().length === 0)
            throw new ValidationException('RefreshToken familyId must be a non-empty string');
        this._familyId = value;
    }

    get tokenHash(): string {
        return this._tokenHash;
    }
    set tokenHash(value: string | undefined) {
        if (value === undefined) return;
        if (typeof value !== 'string' || value.length !== 64)
            throw new ValidationException('RefreshToken tokenHash must be a 64-char hex string');
        this._tokenHash = value;
    }

    get expiresAt(): Date {
        return this._expiresAt;
    }
    set expiresAt(value: Date | undefined) {
        if (value === undefined) return;
        if (!(value instanceof Date) || isNaN(value.getTime()))
            throw new ValidationException('RefreshToken expiresAt must be a valid Date');
        this._expiresAt = value;
    }

    get revokedAt(): Date | null {
        return this._revokedAt;
    }
    set revokedAt(value: Date | null | undefined) {
        if (value === undefined) return;
        if (value !== null && (!(value instanceof Date) || isNaN(value.getTime())))
            throw new ValidationException('RefreshToken revokedAt must be a valid Date or null');
        this._revokedAt = value;
    }

    get replacedBy(): string | null {
        return this._replacedBy;
    }
    set replacedBy(value: string | null | undefined) {
        if (value === undefined) return;
        if (value !== null && (typeof value !== 'string' || value.trim().length === 0))
            throw new ValidationException('RefreshToken replacedBy must be a non-empty string or null');
        this._replacedBy = value;
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
        if (value === undefined) return;
        if (!(value instanceof Date) || isNaN(value.getTime()))
            throw new ValidationException('RefreshToken createdAt must be a valid Date');
        this._createdAt = value;
    }

    isExpired(): boolean {
        return this._expiresAt < new Date();
    }

    isRevoked(): boolean {
        return this._revokedAt !== null;
    }
}
