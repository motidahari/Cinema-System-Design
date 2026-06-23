import {
    ValidationException,
    assertDate,
    assertNullableDate,
    assertNullableString,
    assertString,
} from '@cinema/internal-sdk';

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
        const v = assertString(value, 'id', { optional: true });
        if (v !== undefined) this._id = v;
    }

    get userId(): string {
        return this._userId;
    }
    set userId(value: string | undefined) {
        const v = assertString(value, 'userId', { optional: true });
        if (v !== undefined) this._userId = v;
    }

    get familyId(): string {
        return this._familyId;
    }
    set familyId(value: string | undefined) {
        const v = assertString(value, 'familyId', { optional: true });
        if (v !== undefined) this._familyId = v;
    }

    get tokenHash(): string {
        return this._tokenHash;
    }
    set tokenHash(value: string | undefined) {
        if (value === undefined) return;
        if (typeof value !== 'string' || value.length !== 64)
            throw new ValidationException(`tokenHash must be a 64-char hex string, received length: ${value.length}`);
        this._tokenHash = value;
    }

    get expiresAt(): Date {
        return this._expiresAt;
    }
    set expiresAt(value: Date | undefined) {
        const v = assertDate(value, 'expiresAt', { optional: true });
        if (v !== undefined) this._expiresAt = v;
    }

    get revokedAt(): Date | null {
        return this._revokedAt;
    }
    set revokedAt(value: Date | null | undefined) {
        const v = assertNullableDate(value, 'revokedAt');
        if (v !== undefined) this._revokedAt = v;
    }

    get replacedBy(): string | null {
        return this._replacedBy;
    }
    set replacedBy(value: string | null | undefined) {
        const v = assertNullableString(value, 'replacedBy');
        if (v !== undefined) this._replacedBy = v;
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
        const v = assertDate(value, 'createdAt', { optional: true });
        if (v !== undefined) this._createdAt = v;
    }

    isExpired(): boolean {
        return this._expiresAt < new Date();
    }

    isRevoked(): boolean {
        return this._revokedAt !== null;
    }
}
