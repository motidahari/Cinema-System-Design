import { ValidationException, assertDate, assertString } from '@cinema/internal-sdk';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserModel {
    private _id!: string;
    private _email!: string;
    private _passwordHash!: string;
    private _createdAt!: Date;
    private _updatedAt!: Date;

    constructor(attrs: Partial<UserModel>) {
        this.id = attrs.id;
        this.email = attrs.email;
        this.passwordHash = attrs.passwordHash;
        this.createdAt = attrs.createdAt;
        this.updatedAt = attrs.updatedAt;
    }

    get id(): string {
        return this._id;
    }
    set id(value: string | undefined) {
        const v = assertString(value, 'id', { optional: true });
        if (v !== undefined) this._id = v;
    }

    get email(): string {
        return this._email;
    }
    set email(value: string | undefined) {
        if (value === undefined) return;
        const normalized = value.toLowerCase().trim();
        if (!EMAIL_REGEX.test(normalized))
            throw new ValidationException(`email must be a valid email address, received: "${value}"`);
        this._email = normalized;
    }

    get passwordHash(): string {
        return this._passwordHash;
    }
    set passwordHash(value: string | undefined) {
        const v = assertString(value, 'passwordHash', { optional: true });
        if (v !== undefined) this._passwordHash = v;
    }

    get createdAt(): Date {
        return this._createdAt;
    }
    set createdAt(value: Date | undefined) {
        const v = assertDate(value, 'createdAt', { optional: true });
        if (v !== undefined) this._createdAt = v;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }
    set updatedAt(value: Date | undefined) {
        const v = assertDate(value, 'updatedAt', { optional: true });
        if (v !== undefined) this._updatedAt = v;
    }

    toJSON() {
        return {
            id: this._id,
            email: this._email,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
