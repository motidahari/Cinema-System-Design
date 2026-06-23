import { Response } from 'express';
import { CookieService } from '../../src/infrastructure/cookies/cookie.service';
import { AppConfig } from '../../src/infrastructure/config/app.config';

const mockCfg = {
    cookieSecure: false,
    cookieDomain: undefined,
    cookieSameSite: 'lax' as const,
} as AppConfig;

function makeMockResponse(): jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>> {
    return { cookie: jest.fn(), clearCookie: jest.fn() };
}

describe('CookieService', () => {
    let service: CookieService;

    beforeEach(() => {
        service = new CookieService(mockCfg);
    });

    describe('setAuthCookies, Given:AccessToken only, When:Setting cookies', () => {
        it('should set access_token as httpOnly with 15-min maxAge', () => {
            const res = makeMockResponse();
            service.setAuthCookies(res as unknown as Response, 'token123');

            const call = (res.cookie as jest.Mock).mock.calls.find(([name]) => name === 'access_token');
            expect(call).toBeDefined();
            expect(call[1]).toBe('token123');
            expect(call[2].httpOnly).toBe(true);
            expect(call[2].maxAge).toBe(15 * 60 * 1000);
        });

        it('should set csrf_token as non-httpOnly (readable by JS)', () => {
            const res = makeMockResponse();
            service.setAuthCookies(res as unknown as Response, 'token123');

            const call = (res.cookie as jest.Mock).mock.calls.find(([name]) => name === 'csrf_token');
            expect(call).toBeDefined();
            expect(call[2].httpOnly).toBe(false);
        });

        it('should not set refresh_token when omitted', () => {
            const res = makeMockResponse();
            service.setAuthCookies(res as unknown as Response, 'token123');

            const call = (res.cookie as jest.Mock).mock.calls.find(([name]) => name === 'refresh_token');
            expect(call).toBeUndefined();
        });
    });

    describe('setAuthCookies, Given:AccessToken + RefreshToken, When:Setting cookies', () => {
        it('should set refresh_token with strict sameSite on /api/v1/auth path', () => {
            const res = makeMockResponse();
            service.setAuthCookies(res as unknown as Response, 'access', 'refresh');

            const call = (res.cookie as jest.Mock).mock.calls.find(([name]) => name === 'refresh_token');
            expect(call).toBeDefined();
            expect(call[1]).toBe('refresh');
            expect(call[2].sameSite).toBe('strict');
            expect(call[2].path).toBe('/api/v1/auth');
            expect(call[2].httpOnly).toBe(true);
        });
    });

    describe('clearAuthCookies, When:Clearing', () => {
        it('should clear all three auth cookies', () => {
            const res = makeMockResponse();
            service.clearAuthCookies(res as unknown as Response);

            const clearedNames = (res.clearCookie as jest.Mock).mock.calls.map(([name]) => name);
            expect(clearedNames).toContain('access_token');
            expect(clearedNames).toContain('refresh_token');
            expect(clearedNames).toContain('csrf_token');
        });
    });
});
