import { ValidationException } from '@cinema/internal-sdk';
import { UserModel, UserAttrs } from '../../src/auth/domain-model/user';

const validAttrs: UserAttrs = {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    email: 'alice@cinema.test',
    passwordHash: '$2b$10$examplehashvalue',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('UserModel', () => {
    describe('constructor, Given:Valid attrs, When:Constructing', () => {
        it('should expose all properties correctly', () => {
            const user = new UserModel(validAttrs);
            expect(user.id).toBe(validAttrs.id);
            expect(user.email).toBe(validAttrs.email);
            expect(user.passwordHash).toBe(validAttrs.passwordHash);
            expect(user.createdAt).toBe(validAttrs.createdAt);
            expect(user.updatedAt).toBe(validAttrs.updatedAt);
        });

        it('should normalize email to lowercase and trimmed', () => {
            const user = new UserModel({ ...validAttrs, email: '  Alice@Cinema.TEST  ' });
            expect(user.email).toBe('alice@cinema.test');
        });
    });

    describe('constructor, Given:Empty id, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new UserModel({ ...validAttrs, id: '' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty email, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new UserModel({ ...validAttrs, email: '' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Invalid email format (no @), When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new UserModel({ ...validAttrs, email: 'not-an-email' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Invalid email (missing domain part), When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new UserModel({ ...validAttrs, email: 'alice@' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty passwordHash, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => new UserModel({ ...validAttrs, passwordHash: '' })).toThrow(ValidationException);
        });
    });

    describe('toJSON, Given:A valid user, When:Serializing', () => {
        it('should omit passwordHash from the output', () => {
            const user = new UserModel(validAttrs);
            const json = user.toJSON();
            expect(json).not.toHaveProperty('passwordHash');
        });

        it('should include id, email, createdAt, updatedAt', () => {
            const user = new UserModel(validAttrs);
            const json = user.toJSON();
            expect(json.id).toBe(validAttrs.id);
            expect(json.email).toBe(validAttrs.email);
            expect(json.createdAt).toBe(validAttrs.createdAt);
            expect(json.updatedAt).toBe(validAttrs.updatedAt);
        });
    });
});
