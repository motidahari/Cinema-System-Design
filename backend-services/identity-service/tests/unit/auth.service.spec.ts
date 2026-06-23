import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/service/auth.service';

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
import { UserDao } from '../../src/auth/dao/user.dao';
import { RefreshTokenDao } from '../../src/auth/dao/refresh-token.dao';
import { UserModel } from '../../src/auth/domain-model/user';
import { RefreshTokenModel } from '../../src/auth/domain-model/refresh-token';
import { DuplicateEmailException } from '../../src/auth/exception/duplicate-email.exception';
import { InvalidCredentialsException } from '../../src/auth/exception/invalid-credentials.exception';
import { RecordNotFoundException } from '@cinema/internal-sdk';
import { randomUUID } from 'crypto';
import { Request } from 'express';

const makeUser = (overrides: Partial<ConstructorParameters<typeof UserModel>[0]> = {}): UserModel =>
    new UserModel({
        id: randomUUID(),
        email: 'alice@cinema.test',
        passwordHash: '$2b$10$hashedpassword',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });

const makeRefreshToken = (
    overrides: Partial<ConstructorParameters<typeof RefreshTokenModel>[0]> = {}
): RefreshTokenModel =>
    new RefreshTokenModel({
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
    });

const mockReq = {
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
} as unknown as Request;

describe('AuthService', () => {
    let service: AuthService;
    let userDao: jest.Mocked<UserDao>;
    let refreshTokenDao: jest.Mocked<RefreshTokenDao>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserDao,
                    useValue: {
                        findByEmail: jest.fn(),
                        findById: jest.fn(),
                        getById: jest.fn(),
                        create: jest.fn(),
                    },
                },
                {
                    provide: RefreshTokenDao,
                    useValue: {
                        create: jest.fn(),
                        findByTokenHash: jest.fn(),
                        revokeFamily: jest.fn(),
                        rotateToken: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') },
                },
            ],
        }).compile();

        service = module.get(AuthService);
        userDao = module.get(UserDao);
        refreshTokenDao = module.get(RefreshTokenDao);
    });

    afterEach(() => jest.clearAllMocks());

    describe('register, Given:New email, When:Registering', () => {
        it('should hash password and return profile + access token + refresh token', async () => {
            userDao.findByEmail.mockResolvedValue(null);
            const user = makeUser();
            userDao.create.mockResolvedValue(user);
            (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
            refreshTokenDao.create.mockResolvedValue(makeRefreshToken());

            const result = await service.register('alice@cinema.test', 'password123', mockReq);

            expect(userDao.create).toHaveBeenCalledWith({
                email: 'alice@cinema.test',
                passwordHash: '$2b$10$hashed',
            });
            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.user.email).toBe('alice@cinema.test');
            expect(result.user).toBeInstanceOf(UserModel);
            expect(typeof result.refreshToken).toBe('string');
            expect(result.refreshToken.length).toBeGreaterThan(0);
        });
    });

    describe('register, Given:Existing email, When:Registering', () => {
        it('should throw DuplicateEmailException without creating a user', async () => {
            userDao.findByEmail.mockResolvedValue(makeUser());

            await expect(service.register('alice@cinema.test', 'pass', mockReq)).rejects.toThrow(
                DuplicateEmailException
            );
            expect(userDao.create).not.toHaveBeenCalled();
        });
    });

    describe('login, Given:Valid credentials, When:Logging in', () => {
        it('should return profile + access token + refresh token', async () => {
            const user = makeUser();
            userDao.findByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            refreshTokenDao.create.mockResolvedValue(makeRefreshToken());

            const result = await service.login('alice@cinema.test', 'password123', mockReq);

            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.user.id).toBe(user.id);
            expect(result.user.email).toBe(user.email);
            expect(typeof result.refreshToken).toBe('string');
        });
    });

    describe('login, Given:Unknown email, When:Logging in', () => {
        it('should throw InvalidCredentialsException', async () => {
            userDao.findByEmail.mockResolvedValue(null);

            await expect(service.login('ghost@cinema.test', 'pass', mockReq)).rejects.toThrow(
                InvalidCredentialsException
            );
        });
    });

    describe('login, Given:Wrong password, When:Logging in', () => {
        it('should throw InvalidCredentialsException', async () => {
            userDao.findByEmail.mockResolvedValue(makeUser());
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login('alice@cinema.test', 'wrongpass', mockReq)).rejects.toThrow(
                InvalidCredentialsException
            );
        });
    });

    describe('refresh, Given:Valid unused token, When:Refreshing', () => {
        it('should rotate the token and return new access + refresh tokens', async () => {
            const stored = makeRefreshToken();
            const newStored = makeRefreshToken({ tokenHash: 'b'.repeat(64) });
            refreshTokenDao.findByTokenHash
                .mockResolvedValueOnce(stored) // lookup of presented token
                .mockResolvedValueOnce(newStored); // lookup of newly issued token
            refreshTokenDao.create.mockResolvedValue(newStored);
            userDao.getById.mockResolvedValue(makeUser());

            const result = await service.refresh('raw-opaque-token', mockReq);

            expect(refreshTokenDao.rotateToken).toHaveBeenCalledWith(stored.id, newStored.id);
            expect(result.accessToken).toBe('signed.jwt.token');
            expect(typeof result.refreshToken).toBe('string');
        });
    });

    describe('refresh, Given:Already-revoked token, When:Refreshing', () => {
        it('should revoke the whole family and throw UnauthorizedException', async () => {
            const revoked = makeRefreshToken({ revokedAt: new Date('2026-01-01') });
            refreshTokenDao.findByTokenHash.mockResolvedValue(revoked);

            await expect(service.refresh('stolen-token', mockReq)).rejects.toThrow(UnauthorizedException);
            expect(refreshTokenDao.revokeFamily).toHaveBeenCalledWith(revoked.familyId);
            expect(refreshTokenDao.rotateToken).not.toHaveBeenCalled();
        });
    });

    describe('refresh, Given:Unknown token, When:Refreshing', () => {
        it('should throw UnauthorizedException', async () => {
            refreshTokenDao.findByTokenHash.mockResolvedValue(null);

            await expect(service.refresh('unknown-token', mockReq)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('refresh, Given:Expired token, When:Refreshing', () => {
        it('should throw UnauthorizedException', async () => {
            const expired = makeRefreshToken({ expiresAt: new Date('2020-01-01') });
            refreshTokenDao.findByTokenHash.mockResolvedValue(expired);

            await expect(service.refresh('expired-token', mockReq)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('logout, Given:Valid refresh cookie, When:Logging out', () => {
        it('should revoke the token family', async () => {
            const stored = makeRefreshToken();
            refreshTokenDao.findByTokenHash.mockResolvedValue(stored);

            await service.logout('raw-refresh-token');

            expect(refreshTokenDao.revokeFamily).toHaveBeenCalledWith(stored.familyId);
        });
    });

    describe('logout, Given:No refresh cookie, When:Logging out', () => {
        it('should return silently without touching the DB', async () => {
            await service.logout(undefined);

            expect(refreshTokenDao.findByTokenHash).not.toHaveBeenCalled();
            expect(refreshTokenDao.revokeFamily).not.toHaveBeenCalled();
        });
    });

    describe('getMe, Given:Existing userId, When:Fetching profile', () => {
        it('should return the user domain model', async () => {
            const user = makeUser();
            userDao.getById.mockResolvedValue(user);

            const profile = await service.getMe(user.id);

            expect(profile.id).toBe(user.id);
            expect(profile.email).toBe(user.email);
            expect(profile.createdAt).toBe(user.createdAt);
        });
    });

    describe('getMe, Given:Non-existent userId, When:Fetching profile', () => {
        it('should propagate UserNotFoundException from the DAO', async () => {
            userDao.getById.mockRejectedValue(new RecordNotFoundException('nonexistent-id'));

            await expect(service.getMe('nonexistent-id')).rejects.toThrow(RecordNotFoundException);
        });
    });
});
