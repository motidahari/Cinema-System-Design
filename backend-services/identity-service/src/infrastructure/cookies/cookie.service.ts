import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { AppConfig } from '../config/app.config';

@Injectable()
export class CookieService {
    constructor(private readonly cfg: AppConfig) {}

    setCsrfCookie(res: Response): void {
        res.cookie('csrf_token', randomBytes(16).toString('hex'), {
            httpOnly: false,
            secure: this.cfg.cookieSecure,
            sameSite: this.cfg.cookieSameSite,
            domain: this.cfg.cookieDomain,
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    setAuthCookies(res: Response, accessToken: string, refreshToken?: string): void {
        const base = {
            httpOnly: true,
            secure: this.cfg.cookieSecure,
            domain: this.cfg.cookieDomain,
        };

        res.cookie('access_token', accessToken, {
            ...base,
            sameSite: this.cfg.cookieSameSite,
            path: '/',
            maxAge: 15 * 60 * 1000,
        });

        if (refreshToken !== undefined) {
            res.cookie('refresh_token', refreshToken, {
                ...base,
                sameSite: 'strict',
                path: '/api/v1/auth',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        }

        this.setCsrfCookie(res);
    }

    clearAuthCookies(res: Response): void {
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/v1/auth' });
        res.clearCookie('csrf_token', { path: '/' });
    }
}
