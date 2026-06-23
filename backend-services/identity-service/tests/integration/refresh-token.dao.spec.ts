import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { RefreshTokenDao } from '../../src/auth/dao/refresh-token.dao';
import { RefreshTokenEntity } from '../../src/domain/entities/refresh-token.entity';
import { RefreshTokenModel } from '../../src/auth/domain-model/refresh-token';
import { UserEntity } from '../../src/domain/entities/user.entity';
import { identityTestDataSourceOptions } from './helpers/db.helper';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Generates a realistic 64-character hex string (mimicking sha256 output).
 * Each call returns a unique value so tests stay independent.
 */
function makeHash(): string {
    return randomBytes(32).toString('hex'); // 32 bytes → 64 hex chars
}

function makeUuid(): string {
    return randomUUID();
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('RefreshTokenDao (integration)', () => {
    let module: TestingModule;
    let dao: RefreshTokenDao;
    let dataSource: DataSource;
    let testUserId: string;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot(identityTestDataSourceOptions()),
                TypeOrmModule.forFeature([RefreshTokenEntity, UserEntity]),
            ],
            providers: [RefreshTokenDao],
        }).compile();

        dao = module.get(RefreshTokenDao);
        dataSource = module.get(DataSource);

        // Insert a single user once — refresh tokens need a valid user_id FK.
        const result = await dataSource.query<{ id: string }[]>(
            `INSERT INTO identity.users (email, password_hash)
             VALUES ('rt-test@cinema.test', 'hashed')
             RETURNING id`
        );
        testUserId = result[0].id;
    });

    afterEach(async () => {
        // Tokens first (FK child), then no need to touch the user row between tests.
        await dataSource.query(`DELETE FROM identity.refresh_tokens`);
    });

    afterAll(async () => {
        await dataSource.query(`DELETE FROM identity.refresh_tokens`);
        await dataSource.query(`DELETE FROM identity.users WHERE email = 'rt-test@cinema.test'`);
        await module.close();
    });

    // ── create ─────────────────────────────────────────────────────────────────

    describe('create, Given:Valid userId/familyId/tokenHash, When:Creating a token', () => {
        it('should persist the token and return a RefreshTokenModel with a generated UUID', async () => {
            const familyId = makeUuid();
            const tokenHash = makeHash();

            const token = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash,
                userAgent: 'Mozilla/5.0',
                ip: '127.0.0.1',
            });

            expect(token).toBeInstanceOf(RefreshTokenModel);
            expect(token.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(token.userId).toBe(testUserId);
            expect(token.familyId).toBe(familyId);
            expect(token.tokenHash).toBe(tokenHash);
            expect(token.revokedAt).toBeNull();
            expect(token.replacedBy).toBeNull();
            expect(token.expiresAt).toBeInstanceOf(Date);
            expect(token.createdAt).toBeInstanceOf(Date);
        });

        it('should set expiresAt ~7 days in the future', async () => {
            const token = await dao.create({
                userId: testUserId,
                familyId: makeUuid(),
                tokenHash: makeHash(),
                userAgent: null,
                ip: null,
            });

            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const delta = token.expiresAt.getTime() - Date.now();
            // Allow ±10 seconds of drift
            expect(delta).toBeGreaterThan(sevenDaysMs - 10_000);
            expect(delta).toBeLessThan(sevenDaysMs + 10_000);
        });

        it('should capture nullable userAgent and ip when provided', async () => {
            const token = await dao.create({
                userId: testUserId,
                familyId: makeUuid(),
                tokenHash: makeHash(),
                userAgent: 'TestAgent/1.0',
                ip: '192.168.1.1',
            });

            expect(token.userAgent).toBe('TestAgent/1.0');
            expect(token.ip).toBe('192.168.1.1');
        });

        it('should store null userAgent and ip when omitted', async () => {
            const token = await dao.create({
                userId: testUserId,
                familyId: makeUuid(),
                tokenHash: makeHash(),
                userAgent: null,
                ip: null,
            });

            expect(token.userAgent).toBeNull();
            expect(token.ip).toBeNull();
        });
    });

    describe('create, Given:Duplicate tokenHash, When:Creating a second token', () => {
        it('should throw a unique constraint violation', async () => {
            const sharedHash = makeHash();

            await dao.create({
                userId: testUserId,
                familyId: makeUuid(),
                tokenHash: sharedHash,
                userAgent: null,
                ip: null,
            });

            await expect(
                dao.create({
                    userId: testUserId,
                    familyId: makeUuid(),
                    tokenHash: sharedHash,
                    userAgent: null,
                    ip: null,
                })
            ).rejects.toThrow();
        });
    });

    // ── findByTokenHash ────────────────────────────────────────────────────────

    describe('findByTokenHash, Given:A persisted token, When:Looking up by its hash', () => {
        it('should return the matching RefreshTokenModel', async () => {
            const tokenHash = makeHash();
            const created = await dao.create({
                userId: testUserId,
                familyId: makeUuid(),
                tokenHash,
                userAgent: null,
                ip: null,
            });

            const found = await dao.findByTokenHash(tokenHash);

            expect(found).not.toBeNull();
            expect(found!.id).toBe(created.id);
            expect(found!.tokenHash).toBe(tokenHash);
            expect(found!.revokedAt).toBeNull();
        });
    });

    describe('findByTokenHash, Given:No matching hash, When:Looking up', () => {
        it('should return null', async () => {
            const found = await dao.findByTokenHash(makeHash());
            expect(found).toBeNull();
        });
    });

    describe('findByTokenHash, Given:A revoked token, When:Looking up by hash', () => {
        it('should return the token with revokedAt populated', async () => {
            const tokenHash = makeHash();
            const familyId = makeUuid();

            const created = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash,
                userAgent: null,
                ip: null,
            });

            await dao.revokeFamily(familyId);

            const found = await dao.findByTokenHash(tokenHash);

            expect(found).not.toBeNull();
            expect(found!.id).toBe(created.id);
            expect(found!.revokedAt).toBeInstanceOf(Date);
            expect(found!.isRevoked()).toBe(true);
        });
    });

    // ── rotateToken (replacedBy / rotation chain) ──────────────────────────────

    describe('rotateToken, Given:An active token and a replacement id, When:Rotating', () => {
        it('should set revokedAt and replacedBy on the presented token', async () => {
            const oldHash = makeHash();
            const familyId = makeUuid();

            const oldToken = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: oldHash,
                userAgent: null,
                ip: null,
            });

            const newToken = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: makeHash(),
                userAgent: null,
                ip: null,
            });

            await dao.rotateToken(oldToken.id, newToken.id);

            const rotated = await dao.findByTokenHash(oldHash);

            expect(rotated).not.toBeNull();
            expect(rotated!.revokedAt).toBeInstanceOf(Date);
            expect(rotated!.replacedBy).toBe(newToken.id);
            expect(rotated!.isRevoked()).toBe(true);
        });

        it('should NOT revoke the new (replacement) token', async () => {
            const oldHash = makeHash();
            const newHash = makeHash();
            const familyId = makeUuid();

            const oldToken = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: oldHash,
                userAgent: null,
                ip: null,
            });

            const newToken = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: newHash,
                userAgent: null,
                ip: null,
            });

            await dao.rotateToken(oldToken.id, newToken.id);

            const newFound = await dao.findByTokenHash(newHash);
            expect(newFound!.revokedAt).toBeNull();
            expect(newFound!.isRevoked()).toBe(false);
        });
    });

    // ── revokeFamily ───────────────────────────────────────────────────────────

    describe('revokeFamily, Given:Multiple active tokens in one family, When:Revoking the family', () => {
        it('should set revokedAt on every unrevoked token in the family', async () => {
            const familyId = makeUuid();
            const hash1 = makeHash();
            const hash2 = makeHash();
            const hash3 = makeHash();

            await dao.create({ userId: testUserId, familyId, tokenHash: hash1, userAgent: null, ip: null });
            await dao.create({ userId: testUserId, familyId, tokenHash: hash2, userAgent: null, ip: null });
            await dao.create({ userId: testUserId, familyId, tokenHash: hash3, userAgent: null, ip: null });

            await dao.revokeFamily(familyId);

            const [t1, t2, t3] = await Promise.all([
                dao.findByTokenHash(hash1),
                dao.findByTokenHash(hash2),
                dao.findByTokenHash(hash3),
            ]);

            expect(t1!.revokedAt).toBeInstanceOf(Date);
            expect(t2!.revokedAt).toBeInstanceOf(Date);
            expect(t3!.revokedAt).toBeInstanceOf(Date);
        });

        it('should NOT affect tokens belonging to a different family', async () => {
            const familyA = makeUuid();
            const familyB = makeUuid();
            const hashA = makeHash();
            const hashB = makeHash();

            await dao.create({ userId: testUserId, familyId: familyA, tokenHash: hashA, userAgent: null, ip: null });
            await dao.create({ userId: testUserId, familyId: familyB, tokenHash: hashB, userAgent: null, ip: null });

            await dao.revokeFamily(familyA);

            const tokenB = await dao.findByTokenHash(hashB);
            expect(tokenB!.revokedAt).toBeNull();
            expect(tokenB!.isRevoked()).toBe(false);
        });

        it('should be idempotent when called twice on the same family', async () => {
            const familyId = makeUuid();
            const hash = makeHash();

            await dao.create({ userId: testUserId, familyId, tokenHash: hash, userAgent: null, ip: null });

            await dao.revokeFamily(familyId);
            await expect(dao.revokeFamily(familyId)).resolves.toBeUndefined();

            const token = await dao.findByTokenHash(hash);
            expect(token!.isRevoked()).toBe(true);
        });
    });

    describe('revokeFamily, Given:A family whose only token was already rotated, When:Revoking the family', () => {
        it('should not error and the token should still be revoked', async () => {
            const familyId = makeUuid();
            const oldHash = makeHash();
            const newHash = makeHash();

            const oldToken = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: oldHash,
                userAgent: null,
                ip: null,
            });

            const newToken = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: newHash,
                userAgent: null,
                ip: null,
            });

            // Rotate first: oldToken is revoked, newToken is active
            await dao.rotateToken(oldToken.id, newToken.id);

            // Family revocation (reuse-detection path): must also revoke the new token
            await dao.revokeFamily(familyId);

            const found = await dao.findByTokenHash(newHash);
            expect(found!.isRevoked()).toBe(true);
        });
    });

    // ── expiry filtering via isExpired() ───────────────────────────────────────

    describe('isExpired, Given:A newly created token, When:Checking expiry', () => {
        it('should return false (token is fresh, expires in 7 days)', async () => {
            const token = await dao.create({
                userId: testUserId,
                familyId: makeUuid(),
                tokenHash: makeHash(),
                userAgent: null,
                ip: null,
            });

            expect(token.isExpired()).toBe(false);
        });
    });

    describe('isExpired, Given:A token with expiresAt in the past, When:Checking expiry', () => {
        it('should return true', async () => {
            // Insert directly with an already-past expiresAt to simulate an expired token
            const tokenHash = makeHash();
            const familyId = makeUuid();
            const pastDate = new Date(Date.now() - 1000);

            await dataSource.query(
                `INSERT INTO identity.refresh_tokens
                    (user_id, family_id, token_hash, expires_at, revoked_at, replaced_by, user_agent, ip)
                 VALUES ($1, $2, $3, $4, NULL, NULL, NULL, NULL)`,
                [testUserId, familyId, tokenHash, pastDate.toISOString()]
            );

            const token = await dao.findByTokenHash(tokenHash);

            expect(token).not.toBeNull();
            expect(token!.isExpired()).toBe(true);
        });
    });

    // ── reuse-detection scenario (end-to-end path through the DAO) ────────────

    describe('Reuse detection, Given:Token rt0 rotated to rt1 (rt0 revoked), When:rt0 is replayed', () => {
        it('should find rt0 as revoked, triggering a revokeFamily call that also kills rt1', async () => {
            const familyId = makeUuid();
            const hash0 = makeHash();
            const hash1 = makeHash();

            // Step 1: first login creates rt0
            const rt0 = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: hash0,
                userAgent: null,
                ip: null,
            });

            // Step 2: refresh → rt1 issued, rt0 marked rotated
            const rt1 = await dao.create({
                userId: testUserId,
                familyId,
                tokenHash: hash1,
                userAgent: null,
                ip: null,
            });
            await dao.rotateToken(rt0.id, rt1.id);

            // Step 3: attacker replays rt0 → service detects reuse → revokes whole family
            const presented = await dao.findByTokenHash(hash0);
            expect(presented!.isRevoked()).toBe(true); // reuse confirmed

            await dao.revokeFamily(familyId); // service action on reuse

            // Step 4: verify rt1 is now also revoked (family killed)
            const rt1After = await dao.findByTokenHash(hash1);
            expect(rt1After!.isRevoked()).toBe(true);
        });
    });

    // ── domain model shape ────────────────────────────────────────────────────

    describe('domain model shape, Given:A persisted token, When:Fetching via findByTokenHash', () => {
        it('should expose all expected fields with correct types', async () => {
            const familyId = makeUuid();
            const tokenHash = makeHash();

            await dao.create({
                userId: testUserId,
                familyId,
                tokenHash,
                userAgent: 'Chrome/120',
                ip: '10.0.0.5',
            });

            const token = await dao.findByTokenHash(tokenHash);

            expect(token).not.toBeNull();
            expect(typeof token!.id).toBe('string');
            expect(token!.userId).toBe(testUserId);
            expect(token!.familyId).toBe(familyId);
            expect(token!.tokenHash).toBe(tokenHash);
            expect(token!.expiresAt).toBeInstanceOf(Date);
            expect(token!.createdAt).toBeInstanceOf(Date);
            expect(token!.revokedAt).toBeNull();
            expect(token!.replacedBy).toBeNull();
            expect(token!.userAgent).toBe('Chrome/120');
            expect(token!.ip).toBe('10.0.0.5');
            // domain model methods
            expect(typeof token!.isExpired).toBe('function');
            expect(typeof token!.isRevoked).toBe('function');
            expect(token!.isExpired()).toBe(false);
            expect(token!.isRevoked()).toBe(false);
        });
    });
});
