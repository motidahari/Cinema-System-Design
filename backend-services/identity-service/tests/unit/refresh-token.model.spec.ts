import { ValidationException } from '@cinema/shared';
import { randomUUID } from 'crypto';
import { RefreshTokenModel, RefreshTokenModelAttrs } from '../../src/auth/domain-model/refresh-token';

const TOKEN_HASH = 'a'.repeat(64); // 64-char hex-like string satisfying the validator

const validAttrs: RefreshTokenModelAttrs = {
    id: randomUUID(),
    userId: randomUUID(),
    familyId: randomUUID(),
    tokenHash: TOKEN_HASH,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    revokedAt: null,
    replacedBy: null,
    userAgent: 'Mozilla/5.0',
    ip: '127.0.0.1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeToken(overrides: Partial<RefreshTokenModelAttrs> = {}): RefreshTokenModel {
    return new RefreshTokenModel({ ...validAttrs, ...overrides });
}

function pastDate(msAgo = 1000): Date {
    return new Date(Date.now() - msAgo);
}

function futureDate(msAhead = 60_000): Date {
    return new Date(Date.now() + msAhead);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RefreshTokenModel', () => {
    // ── constructor: valid attrs ──────────────────────────────────────────────

    describe('constructor, Given:Valid attrs, When:Constructing', () => {
        it('should expose all properties correctly', () => {
            const token = makeToken();
            expect(token.id).toBe(validAttrs.id);
            expect(token.userId).toBe(validAttrs.userId);
            expect(token.familyId).toBe(validAttrs.familyId);
            expect(token.tokenHash).toBe(validAttrs.tokenHash);
            expect(token.expiresAt).toBe(validAttrs.expiresAt);
            expect(token.revokedAt).toBeNull();
            expect(token.replacedBy).toBeNull();
            expect(token.userAgent).toBe(validAttrs.userAgent);
            expect(token.ip).toBe(validAttrs.ip);
            expect(token.createdAt).toBe(validAttrs.createdAt);
        });
    });

    // ── id validation ─────────────────────────────────────────────────────────

    describe('constructor, Given:Non-UUID id, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ id: 'not-a-uuid' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty string id, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ id: '' })).toThrow(ValidationException);
        });
    });

    // ── userId validation ─────────────────────────────────────────────────────

    describe('constructor, Given:Non-UUID userId, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ userId: 'not-a-uuid' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty string userId, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ userId: '' })).toThrow(ValidationException);
        });
    });

    // ── familyId validation ───────────────────────────────────────────────────

    describe('constructor, Given:Non-UUID familyId, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ familyId: 'bad-family' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty string familyId, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ familyId: '' })).toThrow(ValidationException);
        });
    });

    // ── tokenHash validation ──────────────────────────────────────────────────

    describe('constructor, Given:tokenHash shorter than 64 chars, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ tokenHash: 'a'.repeat(63) })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:tokenHash longer than 64 chars, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ tokenHash: 'a'.repeat(65) })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty tokenHash, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ tokenHash: '' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Exactly 64-char tokenHash, When:Constructing', () => {
        it('should accept the hash without throwing', () => {
            expect(() => makeToken({ tokenHash: 'b'.repeat(64) })).not.toThrow();
        });
    });

    // ── expiresAt validation ──────────────────────────────────────────────────

    describe('constructor, Given:Invalid Date for expiresAt, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ expiresAt: new Date('invalid') })).toThrow(ValidationException);
        });
    });

    // ── revokedAt validation ──────────────────────────────────────────────────

    describe('constructor, Given:null revokedAt, When:Constructing', () => {
        it('should accept null without throwing', () => {
            expect(() => makeToken({ revokedAt: null })).not.toThrow();
        });
    });

    describe('constructor, Given:Invalid Date for revokedAt, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ revokedAt: new Date('invalid') })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:A valid revokedAt Date, When:Constructing', () => {
        it('should expose revokedAt correctly', () => {
            const revokedAt = new Date('2026-01-02T00:00:00Z');
            const token = makeToken({ revokedAt });
            expect(token.revokedAt).toBe(revokedAt);
        });
    });

    // ── replacedBy validation ─────────────────────────────────────────────────

    describe('constructor, Given:null replacedBy, When:Constructing', () => {
        it('should accept null without throwing', () => {
            expect(() => makeToken({ replacedBy: null })).not.toThrow();
        });
    });

    describe('constructor, Given:Valid UUID for replacedBy, When:Constructing', () => {
        it('should expose replacedBy correctly', () => {
            const replacedById = randomUUID();
            const token = makeToken({ replacedBy: replacedById });
            expect(token.replacedBy).toBe(replacedById);
        });
    });

    describe('constructor, Given:Non-UUID replacedBy, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ replacedBy: 'not-a-uuid' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:Empty string replacedBy, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ replacedBy: '' })).toThrow(ValidationException);
        });
    });

    // ── userAgent validation ──────────────────────────────────────────────────

    describe('constructor, Given:null userAgent, When:Constructing', () => {
        it('should accept null without throwing', () => {
            expect(() => makeToken({ userAgent: null })).not.toThrow();
        });
    });

    describe('constructor, Given:Empty string userAgent, When:Constructing', () => {
        it('should throw ValidationException (empty strings are not allowed)', () => {
            expect(() => makeToken({ userAgent: '' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:A valid userAgent string, When:Constructing', () => {
        it('should expose userAgent correctly', () => {
            const token = makeToken({ userAgent: 'curl/7.88' });
            expect(token.userAgent).toBe('curl/7.88');
        });
    });

    // ── ip validation ─────────────────────────────────────────────────────────

    describe('constructor, Given:null ip, When:Constructing', () => {
        it('should accept null without throwing', () => {
            expect(() => makeToken({ ip: null })).not.toThrow();
        });
    });

    describe('constructor, Given:Empty string ip, When:Constructing', () => {
        it('should throw ValidationException (empty strings are not allowed)', () => {
            expect(() => makeToken({ ip: '' })).toThrow(ValidationException);
        });
    });

    describe('constructor, Given:A valid ip string, When:Constructing', () => {
        it('should expose ip correctly', () => {
            const token = makeToken({ ip: '192.168.1.1' });
            expect(token.ip).toBe('192.168.1.1');
        });
    });

    // ── createdAt validation ──────────────────────────────────────────────────

    describe('constructor, Given:Invalid Date for createdAt, When:Constructing', () => {
        it('should throw ValidationException', () => {
            expect(() => makeToken({ createdAt: new Date('invalid') })).toThrow(ValidationException);
        });
    });

    // ── isExpired() ───────────────────────────────────────────────────────────

    describe('isExpired, Given:expiresAt is 1 second in the past, When:Checking expiry', () => {
        it('should return true', () => {
            const token = makeToken({ expiresAt: pastDate(1000) });
            expect(token.isExpired()).toBe(true);
        });
    });

    describe('isExpired, Given:expiresAt is 7 days in the past, When:Checking expiry', () => {
        it('should return true', () => {
            const token = makeToken({ expiresAt: pastDate(7 * 24 * 60 * 60 * 1000) });
            expect(token.isExpired()).toBe(true);
        });
    });

    describe('isExpired, Given:expiresAt is 1 minute in the future, When:Checking expiry', () => {
        it('should return false', () => {
            const token = makeToken({ expiresAt: futureDate(60_000) });
            expect(token.isExpired()).toBe(false);
        });
    });

    describe('isExpired, Given:expiresAt is 7 days in the future, When:Checking expiry', () => {
        it('should return false', () => {
            const token = makeToken({ expiresAt: futureDate(7 * 24 * 60 * 60 * 1000) });
            expect(token.isExpired()).toBe(false);
        });
    });

    // ── isRevoked() ───────────────────────────────────────────────────────────

    describe('isRevoked, Given:revokedAt is null (active token), When:Checking revocation', () => {
        it('should return false', () => {
            const token = makeToken({ revokedAt: null });
            expect(token.isRevoked()).toBe(false);
        });
    });

    describe('isRevoked, Given:revokedAt is set to a past date, When:Checking revocation', () => {
        it('should return true', () => {
            const token = makeToken({ revokedAt: pastDate(5000) });
            expect(token.isRevoked()).toBe(true);
        });
    });

    describe('isRevoked, Given:revokedAt is set to a future date (edge case), When:Checking revocation', () => {
        it('should return true (any non-null revokedAt means revoked)', () => {
            const token = makeToken({ revokedAt: futureDate(10_000) });
            expect(token.isRevoked()).toBe(true);
        });
    });

    // ── combination: expired AND revoked ─────────────────────────────────────

    describe('isExpired + isRevoked, Given:A token that is both expired and revoked, When:Checking state', () => {
        it('should report both isExpired() true and isRevoked() true', () => {
            const token = makeToken({
                expiresAt: pastDate(24 * 60 * 60 * 1000),
                revokedAt: pastDate(60_000),
            });
            expect(token.isExpired()).toBe(true);
            expect(token.isRevoked()).toBe(true);
        });
    });

    describe('isExpired + isRevoked, Given:An active non-expired token, When:Checking state', () => {
        it('should report both isExpired() false and isRevoked() false', () => {
            const token = makeToken({
                expiresAt: futureDate(60 * 60 * 1000),
                revokedAt: null,
            });
            expect(token.isExpired()).toBe(false);
            expect(token.isRevoked()).toBe(false);
        });
    });

    // ── rotation / replacedBy relationship ───────────────────────────────────

    describe('replacedBy, Given:A token rotated into a successor, When:Checking the replacedBy field', () => {
        it('should hold the successor token UUID', () => {
            const successorId = randomUUID();
            const token = makeToken({
                revokedAt: pastDate(1000),
                replacedBy: successorId,
            });
            expect(token.replacedBy).toBe(successorId);
            expect(token.isRevoked()).toBe(true);
        });
    });

    describe('replacedBy, Given:A fresh token not yet rotated, When:Checking the replacedBy field', () => {
        it('should be null', () => {
            const token = makeToken({ replacedBy: null });
            expect(token.replacedBy).toBeNull();
        });
    });

    // ── familyId ─────────────────────────────────────────────────────────────

    describe('familyId, Given:Two tokens sharing the same family, When:Comparing', () => {
        it('should expose the same familyId UUID on both', () => {
            const sharedFamily = randomUUID();
            const token1 = makeToken({ id: randomUUID(), familyId: sharedFamily });
            const token2 = makeToken({ id: randomUUID(), familyId: sharedFamily });
            expect(token1.familyId).toBe(token2.familyId);
        });
    });
});
