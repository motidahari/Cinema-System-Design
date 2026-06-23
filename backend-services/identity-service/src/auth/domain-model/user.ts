import { ValidationException } from '@cinema/internal-sdk';

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
        if (value === undefined) return;
        if (typeof value !== 'string' || value.trim().length === 0)
            throw new ValidationException('User id must be a non-empty string');
        this._id = value;
    }

    get email(): string {
        return this._email;
    }
    set email(value: string | undefined) {
        if (value === undefined) return;
        const normalized = value.toLowerCase().trim();
        if (!EMAIL_REGEX.test(normalized)) throw new ValidationException(`Invalid email: ${value}`);
        this._email = normalized;
    }

    get passwordHash(): string {
        return this._passwordHash;
    }
    set passwordHash(value: string | undefined) {
        if (value === undefined) return;
        if (typeof value !== 'string' || value.trim().length === 0)
            throw new ValidationException('Password hash must be a non-empty string');
        this._passwordHash = value;
    }

    get createdAt(): Date {
        return this._createdAt;
    }
    set createdAt(value: Date | undefined) {
        if (value === undefined) return;
        if (!(value instanceof Date) || isNaN(value.getTime()))
            throw new ValidationException('createdAt must be a valid Date');
        this._createdAt = value;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }
    set updatedAt(value: Date | undefined) {
        if (value === undefined) return;
        if (!(value instanceof Date) || isNaN(value.getTime()))
            throw new ValidationException('updatedAt must be a valid Date');
        this._updatedAt = value;
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
