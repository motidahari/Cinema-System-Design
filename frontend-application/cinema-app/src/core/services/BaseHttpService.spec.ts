import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios, { AxiosAdapter, AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BaseHttpService, readCookie } from './BaseHttpService';
import { appConfig } from '@/core/config/app.config';

// Concrete subclass exposing the protected client so we can drive requests in tests.
class TestService extends BaseHttpService {
    constructor(adapter: AxiosAdapter) {
        super('http://api.test', { adapter });
    }
    request<T>(method: string, url: string) {
        return this.http.request<T>({ method, url });
    }
}

function ok(config: InternalAxiosRequestConfig, data: unknown = { ok: true }): AxiosResponse {
    return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
    const response = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config } as AxiosResponse;
    return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
}

function clearCookies() {
    document.cookie.split('; ').forEach((c) => {
        const name = c.split('=')[0];
        if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
}

describe('BaseHttpService', () => {
    beforeEach(() => {
        clearCookies();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        clearCookies();
    });

    describe('readCookie', () => {
        it('reads a named cookie value', () => {
            document.cookie = 'csrf_token=abc123';
            expect(readCookie('csrf_token')).toBe('abc123');
        });

        it('returns null when the cookie is absent', () => {
            expect(readCookie('missing')).toBeNull();
        });
    });

    describe('client configuration', () => {
        it('creates the instance with withCredentials enabled', () => {
            const service = new TestService(vi.fn());
            // @ts-expect-error — reach into protected member for assertion
            expect(service.http.defaults.withCredentials).toBe(true);
        });
    });

    describe('CSRF header', () => {
        it('attaches X-CSRF-Token on mutating requests from the csrf_token cookie', async () => {
            document.cookie = 'csrf_token=tok-42';
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => ok(cfg));
            const service = new TestService(adapter);

            await service.request('post', '/reserve');

            const sentHeaders = adapter.mock.calls[0][0].headers as AxiosHeaders;
            expect(sentHeaders.get('X-CSRF-Token')).toBe('tok-42');
        });

        it('does not attach X-CSRF-Token on safe (GET) requests', async () => {
            document.cookie = 'csrf_token=tok-42';
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => ok(cfg));
            const service = new TestService(adapter);

            await service.request('get', '/seats');

            const sentHeaders = adapter.mock.calls[0][0].headers as AxiosHeaders;
            expect(sentHeaders.get('X-CSRF-Token')).toBeFalsy();
        });
    });

    describe('401 handling', () => {
        it('refreshes once and retries the original request', async () => {
            const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} } as AxiosResponse);
            let calls = 0;
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => {
                calls += 1;
                if (calls === 1) throw unauthorized(cfg);
                return ok(cfg, { recovered: true });
            });
            const service = new TestService(adapter);

            const res = await service.request<{ recovered: boolean }>('get', '/protected');

            expect(res.data).toEqual({ recovered: true });
            expect(refresh).toHaveBeenCalledTimes(1);
            expect(refresh).toHaveBeenCalledWith(`${appConfig.identityApiUrl}/auth/refresh`, null, expect.any(Object));
            expect(adapter).toHaveBeenCalledTimes(2);
        });

        it('coalesces concurrent 401s into a single refresh', async () => {
            const refresh = vi
                .spyOn(axios, 'post')
                .mockImplementation(
                    () => new Promise((resolve) => setTimeout(() => resolve({ data: {} } as AxiosResponse), 10))
                );
            const seen: Record<string, number> = {};
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => {
                const url = cfg.url ?? '';
                seen[url] = (seen[url] ?? 0) + 1;
                if (seen[url] === 1) throw unauthorized(cfg);
                return ok(cfg);
            });
            const service = new TestService(adapter);

            await Promise.all([service.request('get', '/a'), service.request('get', '/b')]);

            expect(refresh).toHaveBeenCalledTimes(1);
        });

        it('does not attempt a refresh for the login call itself', async () => {
            const refresh = vi.spyOn(axios, 'post');
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => {
                throw unauthorized(cfg);
            });
            const service = new TestService(adapter);

            await expect(service.request('post', '/auth/login')).rejects.toBeInstanceOf(AxiosError);
            expect(refresh).not.toHaveBeenCalled();
        });

        it('passes non-401 errors straight through without refreshing', async () => {
            const refresh = vi.spyOn(axios, 'post');
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => {
                const response = {
                    data: {},
                    status: 500,
                    statusText: 'Server Error',
                    headers: {},
                    config: cfg,
                } as AxiosResponse;
                throw new AxiosError('Server Error', 'ERR_BAD_RESPONSE', cfg, null, response);
            });
            const service = new TestService(adapter);

            await expect(service.request('get', '/boom')).rejects.toMatchObject({ response: { status: 500 } });
            expect(refresh).not.toHaveBeenCalled();
        });

        it('redirects to /login when the refresh fails', async () => {
            const originalLocation = window.location;
            Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
            vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh dead'));
            const adapter = vi.fn(async (cfg: InternalAxiosRequestConfig) => {
                throw unauthorized(cfg);
            });
            const service = new TestService(adapter);

            await expect(service.request('get', '/protected')).rejects.toBeTruthy();
            expect(window.location.href).toBe('/login');

            Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
        });
    });
});
