import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Logger } from '@cinema/internal-sdk';
import { UserDao } from '../dao/user.dao';
import { UserModel } from '../domain-model/user';
import { DuplicateEmailException } from '../exception/duplicate-email.exception';
import { InvalidCredentialsException } from '../exception/invalid-credentials.exception';
import { UserNotFoundException } from '../exception/user-not-found.exception';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
    constructor(
        private readonly userDao: UserDao,
        private readonly jwtService: JwtService
    ) {}

    async register(email: string, password: string): Promise<{ user: UserModel; accessToken: string }> {
        const existing = await this.userDao.findByEmail(email);
        if (existing) {
            throw new DuplicateEmailException(email);
        }
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await this.userDao.create({ email, passwordHash });
        const accessToken = this.signToken(user);
        Logger.info('User registered', { userId: user.id });
        return { user, accessToken };
    }

    async login(email: string, password: string): Promise<{ user: UserModel; accessToken: string }> {
        const user = await this.userDao.findByEmail(email);
        if (!user) {
            throw new InvalidCredentialsException();
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new InvalidCredentialsException();
        }
        const accessToken = this.signToken(user);
        Logger.info('User logged in', { userId: user.id });
        return { user, accessToken };
    }

    async getMe(userId: string): Promise<UserModel> {
        const user = await this.userDao.findById(userId);
        if (!user) {
            throw new UserNotFoundException(userId);
        }
        return user;
    }

    private signToken(user: UserModel): string {
        return this.jwtService.sign({ userId: user.id, email: user.email });
    }
}
