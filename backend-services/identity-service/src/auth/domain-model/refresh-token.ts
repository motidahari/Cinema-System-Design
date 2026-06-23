import { ValidationException, isValidDate, isValidString, isValidUuid } from '@cinema/internal-sdk';

export interface RefreshTokenModelAttrs {
    id: string;
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedBy: string | null;
    userAgent: string | null;
    ip: string | null;
    createdAt: Date;
}

export class RefreshTokenModel {
    private _id!: string;
    private _userId!: string;
    private _familyId!: string;
    private _tokenHash!: string;
    private _expiresAt!: Date;
    private _revokedAt!: Date | null;
    private _replacedBy!: string | null;
    private _userAgent!: string | null;
    private _ip!: string | null;
    private _createdAt!: Date;

    constructor(attrs: RefreshTokenModelAttrs) {
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

    get familyId(): string {
        return this._familyId;
    }
    set familyId(value: string) {
        if (!isValidUuid(value)) throw new ValidationException(`familyId must be a valid UUID, received: "${value}"`);
        this._familyId = value;
    }

    get tokenHash(): string {
        return this._tokenHash;
    }
    set tokenHash(value: string) {
        if (!isValidString(value, { min: 64, max: 64 }))
            throw new ValidationException(`tokenHash must be a 64-char hex string, received length: ${value.length}`);
        this._tokenHash = value;
    }

    get expiresAt(): Date {
        return this._expiresAt;
    }
    set expiresAt(value: Date) {
        if (!isValidDate(value))
            throw new ValidationException(`expiresAt must be a valid Date, received: ${String(value)}`);
        this._expiresAt = value;
    }

    get revokedAt(): Date | null {
        return this._revokedAt;
    }
    set revokedAt(value: Date | null) {
        if (!isValidDate(value, { nullable: true }))
            throw new ValidationException(`revokedAt must be a valid Date or null, received: ${String(value)}`);
        this._revokedAt = value;
    }

    get replacedBy(): string | null {
        return this._replacedBy;
    }
    set replacedBy(value: string | null) {
        if (value !== null && !isValidUuid(value))
            throw new ValidationException(`replacedBy must be a valid UUID or null, received: "${value}"`);
        this._replacedBy = value;
    }

    get userAgent(): string | null {
        return this._userAgent;
    }
    set userAgent(value: string | null) {
        if (!isValidString(value, { nullable: true }))
            throw new ValidationException(`userAgent must be a non-empty string or null, received: "${value}"`);
        this._userAgent = value;
    }

    get ip(): string | null {
        return this._ip;
    }
    set ip(value: string | null) {
        if (!isValidString(value, { nullable: true }))
            throw new ValidationException(`ip must be a non-empty string or null, received: "${value}"`);
        this._ip = value;
    }

    get createdAt(): Date {
        return this._createdAt;
    }
    set createdAt(value: Date) {
        if (!isValidDate(value))
            throw new ValidationException(`createdAt must be a valid Date, received: ${String(value)}`);
        this._createdAt = value;
    }

    isExpired(): boolean {
        return this._expiresAt < new Date();
    }

    isRevoked(): boolean {
        return this._revokedAt !== null;
    }
}
