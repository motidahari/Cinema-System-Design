import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { RefreshTokenDao } from '../../src/auth/dao/refresh-token.dao';
import { RefreshTokenEntity } from '../../src/domain/entities/refresh-token.entity';
import { RefreshTokenModel } from '../../src/auth/domain-model/refresh-token';

const makeEntity = (overrides: Partial<RefreshTokenEntity> = {}): RefreshTokenEntity =>
    ({
        id: randomUUID(),
        userId: randomUUID(),
        familyId: randomUUID(),
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        replacedBy: null,
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    }) as RefreshTokenEntity;

describe('RefreshTokenDao', () => {
    let dao: RefreshTokenDao;
    let mockRepo: {
        findOne: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockQb: {
        update: jest.Mock;
        set: jest.Mock;
        where: jest.Mock;
        execute: jest.Mock;
    };

    beforeEach(async () => {
        mockQb = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        mockRepo = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [RefreshTokenDao, { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRepo }],
        }).compile();

        dao = module.get(RefreshTokenDao);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findByTokenHash, Given:Known hash, When:Looking up', () => {
        it('should return the mapped domain model', async () => {
            const entity = makeEntity();
            mockRepo.findOne.mockResolvedValue(entity);

            const result = await dao.findByTokenHash(entity.tokenHash);

            expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { tokenHash: entity.tokenHash } });
            expect(result).toBeInstanceOf(RefreshTokenModel);
            expect(result?.tokenHash).toBe(entity.tokenHash);
            expect(result?.userId).toBe(entity.userId);
        });
    });

    describe('findByTokenHash, Given:Unknown hash, When:Looking up', () => {
        it('should return null', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            const result = await dao.findByTokenHash('unknown-hash');

            expect(result).toBeNull();
        });
    });

    describe('create, Given:Valid attrs, When:Creating', () => {
        it('should persist and return the domain model with a future expiry', async () => {
            const entity = makeEntity();
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(entity);

            const result = await dao.create({
                userId: entity.userId,
                familyId: entity.familyId,
                tokenHash: entity.tokenHash,
                userAgent: entity.userAgent,
                ip: entity.ip,
            });

            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result).toBeInstanceOf(RefreshTokenModel);
            expect(result.userId).toBe(entity.userId);
            expect(result.familyId).toBe(entity.familyId);
            expect(result.revokedAt).toBeNull();
        });
    });

    describe('revokeFamily, Given:A family ID, When:Revoking', () => {
        it('should update only non-revoked rows in that family', async () => {
            const familyId = randomUUID();

            await dao.revokeFamily(familyId);

            expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
            expect(mockQb.update).toHaveBeenCalled();
            expect(mockQb.where).toHaveBeenCalledWith('family_id = :familyId AND revoked_at IS NULL', { familyId });
            expect(mockQb.execute).toHaveBeenCalled();
        });
    });

    describe('rotateToken, Given:An existing token, When:Rotating', () => {
        it('should mark the old token revoked and record the replacement id', async () => {
            const oldId = randomUUID();
            const newId = randomUUID();

            await dao.rotateToken(oldId, newId);

            expect(mockRepo.update).toHaveBeenCalledWith(
                oldId,
                expect.objectContaining({ replacedBy: newId, revokedAt: expect.any(Date) })
            );
        });
    });
});
