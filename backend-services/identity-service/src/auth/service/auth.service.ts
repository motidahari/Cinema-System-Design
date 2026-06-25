import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Request } from 'express';
import { Logger } from '@cinema/shared';
import { UserDao } from '../dao/user.dao';
import { RefreshTokenDao } from '../dao/refresh-token.dao';
import { LoginAttemptDao } from '../dao/login-attempt.dao';
import { UserModel } from '../domain-model/user';
import { AppConfig } from '../../infrastructure/config/app.config';
import { DuplicateEmailException } from '../exception/duplicate-email.exception';
import { InvalidCredentialsException } from '../exception/invalid-credentials.exception';
import { AccountLockedException } from '../exception/account-locked.exception';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

const BCRYPT_ROUNDS = 12;

export interface TokenPair {
    user: UserModel;
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly userDao: UserDao,
        private readonly refreshTokenDao: RefreshTokenDao,
        private readonly loginAttemptDao: LoginAttemptDao,
        private readonly jwtService: JwtService,
        private readonly appConfig: AppConfig
    ) {}

    async register(dto: RegisterDto, req: Request): Promise<TokenPair> {
        const normalizedEmail = dto.email.toLowerCase().trim();
        const existing = await this.userDao.findByEmail(normalizedEmail);
        if (existing) {
            throw new DuplicateEmailException(normalizedEmail);
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const user = await this.userDao.create({ email: normalizedEmail, passwordHash });
        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id, randomUUID(), req);
        Logger.info('User registered', { userId: user.id });
        return { user, accessToken, refreshToken };
    }

    async login(dto: LoginDto, req: Request): Promise<TokenPair> {
        const normalizedEmail = dto.email.toLowerCase().trim();
        const ip = this.getClientIp(req) ?? '';

        if (await this.loginAttemptDao.isLocked(normalizedEmail, ip)) {
            throw new AccountLockedException();
        }

        const user = await this.userDao.findByEmail(normalizedEmail);
        if (!user) {
            await this.loginAttemptDao.recordFailure(
                normalizedEmail,
                ip,
                this.appConfig.loginLockThreshold,
                this.appConfig.loginLockWindowMin
            );
            throw new InvalidCredentialsException();
        }

        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            await this.loginAttemptDao.recordFailure(
                normalizedEmail,
                ip,
                this.appConfig.loginLockThreshold,
                this.appConfig.loginLockWindowMin
            );
            throw new InvalidCredentialsException();
        }

        await this.loginAttemptDao.clear(normalizedEmail, ip);
        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id, randomUUID(), req);
        Logger.info('User logged in', { userId: user.id });
        return { user, accessToken, refreshToken };
    }

    async refresh(rawToken: string, req: Request): Promise<TokenPair> {
        const tokenHash = this.hashToken(rawToken);
        const stored = await this.refreshTokenDao.findByTokenHash(tokenHash);

        if (!stored || stored.isExpired()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        if (stored.isRevoked()) {
            // Reuse detected — revoke the entire family
            await this.refreshTokenDao.revokeFamily(stored.familyId);
            Logger.warning('Refresh token reuse detected — family revoked', {
                userId: stored.userId,
                familyId: stored.familyId,
            });
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = await this.userDao.getById(stored.userId);
        const newRawToken = await this.issueRefreshToken(user.id, stored.familyId, req);
        const newTokenHash = this.hashToken(newRawToken);
        const newStored = await this.refreshTokenDao.findByTokenHash(newTokenHash);
        await this.refreshTokenDao.rotateToken(stored.id, newStored!.id);

        const accessToken = this.signAccessToken(user);
        Logger.info('Refresh token rotated', { userId: user.id });
        return { user, accessToken, refreshToken: newRawToken };
    }

    async logout(rawRefreshToken: string | undefined): Promise<void> {
        if (!rawRefreshToken) return;
        const tokenHash = this.hashToken(rawRefreshToken);
        const stored = await this.refreshTokenDao.findByTokenHash(tokenHash);
        if (stored) {
            await this.refreshTokenDao.revokeFamily(stored.familyId);
            Logger.info('User logged out — family revoked', { userId: stored.userId });
        }
    }

    async getMe(userId: string): Promise<UserModel> {
        return this.userDao.getById(userId);
    }

    private signAccessToken(user: UserModel): string {
        return this.jwtService.sign({ userId: user.id, email: user.email });
    }

    private hashToken(raw: string): string {
        return createHash('sha256').update(raw).digest('hex');
    }

    private async issueRefreshToken(userId: string, familyId: string, req: Request): Promise<string> {
        const raw = randomBytes(32).toString('hex');
        await this.refreshTokenDao.create({
            userId,
            familyId,
            tokenHash: this.hashToken(raw),
            userAgent: this.getUserAgent(req),
            ip: this.getClientIp(req),
        });
        return raw;
    }

    private getClientIp(req: Request): string | null {
        const ip = req.ip?.trim();
        return ip ? ip.slice(0, 64) : null;
    }

    private getUserAgent(req: Request): string | null {
        const header = req.headers['user-agent'];
        const value = Array.isArray(header) ? header[0] : header;
        const userAgent = typeof value === 'string' ? value.trim() : '';
        return userAgent ? userAgent.slice(0, 512) : null;
    }
}
