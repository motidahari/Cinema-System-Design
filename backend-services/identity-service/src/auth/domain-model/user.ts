import { EMAIL_PATTERN, ValidationException, isValidDate, isValidString, isValidUuid } from '@cinema/internal-sdk';

export interface UserModelAttrs {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}

export class UserModel {
    private _id!: string;
    private _email!: string;
    private _passwordHash!: string;
    private _createdAt!: Date;
    private _updatedAt!: Date;

    constructor(attrs: UserModelAttrs) {
        this.id = attrs.id;
        this.email = attrs.email;
        this.passwordHash = attrs.passwordHash;
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

    get email(): string {
        return this._email;
    }
    set email(value: string) {
        const normalized = value.toLowerCase().trim();
        if (!isValidString(normalized, { pattern: EMAIL_PATTERN }))
            throw new ValidationException(`email must be a valid email address, received: "${value}"`);
        this._email = normalized;
    }

    get passwordHash(): string {
        return this._passwordHash;
    }
    set passwordHash(value: string) {
        if (!isValidString(value))
            throw new ValidationException(`passwordHash must be a non-empty string, received: "${value}"`);
        this._passwordHash = value;
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

    toJSON() {
        return {
            id: this._id,
            email: this._email,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
