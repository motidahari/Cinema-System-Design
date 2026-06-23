import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../src/auth/service/auth.service';

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
import { UserDao } from '../../src/auth/dao/user.dao';
import { UserModel } from '../../src/auth/domain-model/user';
import { DuplicateEmailException } from '../../src/auth/exception/duplicate-email.exception';
import { InvalidCredentialsException } from '../../src/auth/exception/invalid-credentials.exception';
import { UserNotFoundException } from '../../src/auth/exception/user-not-found.exception';

const makeUser = (overrides: Partial<ConstructorParameters<typeof UserModel>[0]> = {}): UserModel =>
    new UserModel({
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        email: 'alice@cinema.test',
        passwordHash: '$2b$10$hashedpassword',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });

describe('AuthService', () => {
    let service: AuthService;
    let userDao: jest.Mocked<UserDao>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserDao,
                    useValue: {
                        findByEmail: jest.fn(),
                        findById: jest.fn(),
                        create: jest.fn(),
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
    });

    afterEach(() => jest.clearAllMocks());

    describe('register, Given:New email, When:Registering', () => {
        it('should hash password and return profile + access token', async () => {
            userDao.findByEmail.mockResolvedValue(null);
            const user = makeUser();
            userDao.create.mockResolvedValue(user);
            (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');

            const result = await service.register('alice@cinema.test', 'password123');

            expect(userDao.create).toHaveBeenCalledWith({
                email: 'alice@cinema.test',
                passwordHash: '$2b$10$hashed',
            });
            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.user.email).toBe('alice@cinema.test');
            expect(result.user).toBeInstanceOf(UserModel);
        });
    });

    describe('register, Given:Existing email, When:Registering', () => {
        it('should throw DuplicateEmailException without creating a user', async () => {
            userDao.findByEmail.mockResolvedValue(makeUser());

            await expect(service.register('alice@cinema.test', 'pass')).rejects.toThrow(DuplicateEmailException);
            expect(userDao.create).not.toHaveBeenCalled();
        });
    });

    describe('login, Given:Valid credentials, When:Logging in', () => {
        it('should return profile + access token', async () => {
            const user = makeUser();
            userDao.findByEmail.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login('alice@cinema.test', 'password123');

            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.user.id).toBe(user.id);
            expect(result.user.email).toBe(user.email);
        });
    });

    describe('login, Given:Unknown email, When:Logging in', () => {
        it('should throw InvalidCredentialsException', async () => {
            userDao.findByEmail.mockResolvedValue(null);

            await expect(service.login('ghost@cinema.test', 'pass')).rejects.toThrow(InvalidCredentialsException);
        });
    });

    describe('login, Given:Wrong password, When:Logging in', () => {
        it('should throw InvalidCredentialsException', async () => {
            userDao.findByEmail.mockResolvedValue(makeUser());
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login('alice@cinema.test', 'wrongpass')).rejects.toThrow(InvalidCredentialsException);
        });
    });

    describe('getMe, Given:Existing userId, When:Fetching profile', () => {
        it('should return the user profile', async () => {
            const user = makeUser();
            userDao.findById.mockResolvedValue(user);

            const profile = await service.getMe(user.id);

            expect(profile.id).toBe(user.id);
            expect(profile.email).toBe(user.email);
            expect(profile.createdAt).toBe(user.createdAt);
        });
    });

    describe('getMe, Given:Non-existent userId, When:Fetching profile', () => {
        it('should throw UserNotFoundException', async () => {
            userDao.findById.mockResolvedValue(null);

            await expect(service.getMe('nonexistent-id')).rejects.toThrow(UserNotFoundException);
        });
    });
});
