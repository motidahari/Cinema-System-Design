import { ValidationException } from '@cinema/internal-sdk';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserAttrs {
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

    constructor(attrs: UserAttrs) {
        this.setId(attrs.id);
        this.setEmail(attrs.email);
        this.setPasswordHash(attrs.passwordHash);
        this._createdAt = attrs.createdAt;
        this._updatedAt = attrs.updatedAt;
    }

    get id(): string {
        return this._id;
    }

    get email(): string {
        return this._email;
    }

    get passwordHash(): string {
        return this._passwordHash;
    }

    get createdAt(): Date {
        return this._createdAt;
    }

    get updatedAt(): Date {
        return this._updatedAt;
    }

    private setId(id: string): void {
        if (!id) throw new ValidationException('User id is required');
        this._id = id;
    }

    private setEmail(email: string): void {
        if (!email) throw new ValidationException('User email is required');
        const normalized = email.toLowerCase().trim();
        if (!EMAIL_REGEX.test(normalized)) {
            throw new ValidationException(`Invalid email: ${email}`);
        }
        this._email = normalized;
    }

    private setPasswordHash(hash: string): void {
        if (!hash) throw new ValidationException('Password hash is required');
        this._passwordHash = hash;
    }

    toJSON(): Omit<UserAttrs, 'passwordHash'> {
        return {
            id: this._id,
            email: this._email,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
