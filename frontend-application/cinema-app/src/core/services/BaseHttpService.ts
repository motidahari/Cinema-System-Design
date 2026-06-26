import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/core/config/app.config';

// Module-level shared refresh promise — shared across ALL service instances so that
// concurrent 401s coalesce into a single POST /auth/refresh (no thundering herd).
let refreshPromise: Promise<void> | null = null;
let csrfPromise: Promise<void> | null = null;

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

export function readCookie(name: string): string | null {
    return (
        document.cookie
            .split('; ')
            .find((c) => c.startsWith(`${name}=`))
            ?.split('=')[1] ?? null
    );
}

/**
 * Cookie-based HTTP client. The browser sends the `access_token` cookie automatically,
 * so the service never reads or attaches a token in JS. It only:
 *  - sets `withCredentials: true` so cookies cross the (dev) origin;
 *  - attaches the `X-CSRF-Token` header (from the readable `csrf_token` cookie) on
 *    mutating requests;
 *  - on a 401, performs a single shared `POST /auth/refresh` and retries once. If the
 *    refresh fails the session is gone, so it redirects to `/login` (a full navigation,
 *    which also clears all in-memory store state).
 */
export abstract class BaseHttpService {
    protected readonly http: AxiosInstance;

    constructor(baseURL: string, config: AxiosRequestConfig = {}) {
        this.http = axios.create({ baseURL, withCredentials: true, ...config });
        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // Request: attach CSRF header on mutating requests (no token handling).
        this.http.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
            if (cfg.method && MUTATING.has(cfg.method.toLowerCase())) {
                let csrf = readCookie('csrf_token');
                if (!csrf) {
                    csrfPromise ??= axios
                        .get(`${appConfig.identityApiUrl}/auth/csrf`, { withCredentials: true })
                        .then(() => undefined)
                        .finally(() => {
                            csrfPromise = null;
                        });
                    await csrfPromise;
                    csrf = readCookie('csrf_token');
                }
                if (csrf) cfg.headers.set('X-CSRF-Token', csrf);
            }
            return cfg;
        });

        // Response: single refresh-and-retry on 401 (shared promise).
        this.http.interceptors.response.use(
            (res) => res,
            async (error: AxiosError) => {
                const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
                const status = error.response?.status;

                // Don't try to refresh the auth calls themselves, and only retry once.
                const isAuthCall = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login');
                if (status !== 401 || !original || original._retried || isAuthCall) {
                    return Promise.reject(error);
                }
                original._retried = true;

                try {
                    // Coalesce concurrent 401s into ONE refresh.
                    refreshPromise ??= axios
                        .post(`${appConfig.identityApiUrl}/auth/refresh`, null, {
                            withCredentials: true,
                            headers: { 'X-CSRF-Token': readCookie('csrf_token') ?? '' },
                        })
                        .then(() => undefined)
                        .finally(() => {
                            refreshPromise = null;
                        });

                    await refreshPromise;
                    return this.http(original); // retry with the new access cookie
                } catch (refreshErr) {
                    // Refresh failed → session is gone. A full navigation clears all
                    // in-memory state and sends the user back to the login screen. Skip it
                    // when we're already on /login, otherwise the initial guest session
                    // probe (GET /auth/me → 401 → failed refresh) would reload in a loop.
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshErr);
                }
            }
        );
    }
}
