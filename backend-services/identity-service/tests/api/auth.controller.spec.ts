/**
 * Auth Controller — API Tests
 *
 * Covers every endpoint documented in API-CONTRACT.md §1:
 *   POST /api/v1/auth/register  — happy path + 400 invalid body + 409 duplicate email + 403 CSRF
 *   POST /api/v1/auth/login     — happy path + 400 + 401 bad creds + 403 CSRF + 429 lockout
 *   POST /api/v1/auth/refresh   — happy path + 401 missing cookie + 401 expired/unknown
 *                                 + 401 reuse-detection (family revoked) + 403 CSRF
 *   POST /api/v1/auth/logout    — happy path (204 + cleared cookies) + 401 unauthenticated
 *   GET  /api/v1/auth/me        — happy path + 401 unauthenticated
 *   GET  /api/v1/auth/validate  — happy path + 401 unauthenticated
 *
 * Cookie assertions follow SECURITY.md §3 and API-CONTRACT.md §1.
 */

import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { buildAuthTestApp, truncateIdentityTables } from './helpers/db.helper';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const CSRF_VALUE = 'test-csrf-token-value';

/** Set-Cookie header is a string[] (or a single string) depending on the supertest version. */
function parseCookies(res: request.Response): string[] {
    const raw = res.headers['set-cookie'];
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
}

function findCookie(cookies: string[], name: string): string | undefined {
    return cookies.find((c) => c.startsWith(`${name}=`));
}

function extractCookieValue(cookieLine: string): string {
    // e.g. "access_token=eyJ...; HttpOnly; ..."  → "eyJ..."
    return cookieLine.split(';')[0].split('=').slice(1).join('=');
}

/**
 * Registers a user and returns the Set-Cookie headers so that subsequent
 * requests can reuse the access_token/refresh_token/csrf_token.
 */
async function registerUser(
    app: INestApplication,
    email = 'testuser@cinema.test',
    password = 'SecretPass1!'
): Promise<{ cookies: string[]; csrfToken: string }> {
    const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Cookie', `csrf_token=${CSRF_VALUE}`)
        .set('X-CSRF-Token', CSRF_VALUE)
        .send({ email, password })
        .expect(201);

    const cookies = parseCookies(res);
    const csrfCookie = findCookie(cookies, 'csrf_token');
    // The server issues a NEW csrf_token on every auth response; use that one.
    const csrfToken = csrfCookie ? extractCookieValue(csrfCookie) : CSRF_VALUE;
    return { cookies, csrfToken };
}

/** Builds a Cookie header string from an array of Set-Cookie strings. */
function buildCookieHeader(setCookies: string[]): string {
    return setCookies
        .map((c) => c.split(';')[0]) // "name=value" part only
        .join('; ');
}

// ──────────────────────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────────────────────

describe('AuthController (api)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await buildAuthTestApp();
    });

    beforeEach(async () => {
        await truncateIdentityTables(app);
    });

    afterAll(async () => {
        await app.close();
    });

    // ── POST /api/v1/auth/register ───────────────────────────────────────────

    describe('Register, Given:Valid email and strong password with CSRF, When:Registering', () => {
        it('should return 201 with user profile in body', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'alice@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(201);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(res.body.user.email).toBe('alice@cinema.test');
            expect(res.body.user.createdAt).toBeDefined();
            expect(res.body).not.toHaveProperty('accessToken');
            expect(res.body).not.toHaveProperty('refreshToken');
        });

        it('should set httpOnly access_token cookie on /path=/)', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'bob@cinema.test', password: 'SecretPass1!' });

            const cookies = parseCookies(res);
            const accessCookie = findCookie(cookies, 'access_token');
            expect(accessCookie).toBeDefined();
            expect(accessCookie).toMatch(/HttpOnly/i);
            expect(accessCookie).toMatch(/Path=\//);
        });

        it('should set httpOnly refresh_token cookie scoped to /api/v1/auth', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'carol@cinema.test', password: 'SecretPass1!' });

            const cookies = parseCookies(res);
            const refreshCookie = findCookie(cookies, 'refresh_token');
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie).toMatch(/HttpOnly/i);
            expect(refreshCookie).toMatch(/Path=\/api\/v1\/auth/);
        });

        it('should set a readable (non-HttpOnly) csrf_token cookie', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'dave@cinema.test', password: 'SecretPass1!' });

            const cookies = parseCookies(res);
            const csrfCookie = findCookie(cookies, 'csrf_token');
            expect(csrfCookie).toBeDefined();
            // Must NOT be HttpOnly so the SPA can read it
            const lower = csrfCookie!.toLowerCase();
            expect(lower).not.toContain('httponly');
        });

        it('should normalize email to lowercase', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'Eve@Cinema.TEST', password: 'SecretPass1!' });

            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe('eve@cinema.test');
        });
    });

    describe('Register, Given:Invalid email format, When:Registering', () => {
        it('should return 400 with errorCode 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'not-an-email', password: 'SecretPass1!' });

            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe(400);
            expect(res.body.errorMessage).toMatch(/email/i);
        });
    });

    describe('Register, Given:Weak password (too short), When:Registering', () => {
        it('should return 400 with errorCode 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'frank@cinema.test', password: 'weak' });

            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe(400);
        });
    });

    describe('Register, Given:Weak password (no special character), When:Registering', () => {
        it('should return 400 with password policy message', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'grace@cinema.test', password: 'NoSpecial1' });

            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe(400);
        });
    });

    describe('Register, Given:Missing request body, When:Registering', () => {
        it('should return 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('Register, Given:Duplicate email (email already registered), When:Registering', () => {
        it('should return 409 with errorCode 409', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'dup@cinema.test', password: 'SecretPass1!' })
                .expect(201);

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'dup@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(409);
            expect(res.body.errorCode).toBe(409);
        });
    });

    describe('Register, Given:Missing X-CSRF-Token header, When:Registering', () => {
        it('should return 403 CSRF token mismatch', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({ email: 'csrf-test@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(403);
            expect(res.body.errorCode).toBe(403);
            expect(res.body.errorMessage).toMatch(/CSRF/i);
        });
    });

    describe('Register, Given:Mismatched X-CSRF-Token and cookie, When:Registering', () => {
        it('should return 403', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .set('Cookie', `csrf_token=correct-token`)
                .set('X-CSRF-Token', 'wrong-token')
                .send({ email: 'csrf2@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(403);
        });
    });

    // ── POST /api/v1/auth/login ──────────────────────────────────────────────

    describe('Login, Given:Valid credentials and CSRF, When:Logging in', () => {
        it('should return 200 with user profile in body and no tokens in body', async () => {
            await registerUser(app, 'login-user@cinema.test');

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'login-user@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('login-user@cinema.test');
            expect(res.body).not.toHaveProperty('accessToken');
            expect(res.body).not.toHaveProperty('refreshToken');
        });

        it('should set httpOnly access_token, refresh_token, and readable csrf_token cookies', async () => {
            await registerUser(app, 'cookie-check@cinema.test');

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'cookie-check@cinema.test', password: 'SecretPass1!' });

            const cookies = parseCookies(res);
            const accessCookie = findCookie(cookies, 'access_token');
            const refreshCookie = findCookie(cookies, 'refresh_token');
            const csrfCookie = findCookie(cookies, 'csrf_token');

            expect(accessCookie).toMatch(/HttpOnly/i);
            expect(refreshCookie).toMatch(/HttpOnly/i);
            expect(refreshCookie).toMatch(/Path=\/api\/v1\/auth/);
            expect(csrfCookie).toBeDefined();
            expect(csrfCookie!.toLowerCase()).not.toContain('httponly');
        });
    });

    describe('Login, Given:Invalid email format, When:Logging in', () => {
        it('should return 400', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'not-valid', password: 'SecretPass1!' });

            expect(res.status).toBe(400);
            expect(res.body.errorCode).toBe(400);
        });
    });

    describe('Login, Given:Wrong password for existing user, When:Logging in', () => {
        it('should return 401 with errorCode 401', async () => {
            await registerUser(app, 'wrong-pw@cinema.test');

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'wrong-pw@cinema.test', password: 'WrongPass1!' });

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
            expect(res.body.errorMessage).toMatch(/Invalid email or password/i);
        });
    });

    describe('Login, Given:Non-existent email, When:Logging in', () => {
        it('should return 401 (no user-enumeration leak)', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'nobody@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
        });
    });

    describe('Login, Given:Missing X-CSRF-Token header, When:Logging in', () => {
        it('should return 403', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: 'user@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(403);
            expect(res.body.errorCode).toBe(403);
        });
    });

    describe('Login, Given:Account locked after too many failures, When:Logging in', () => {
        it('should return 429 after exceeding the lockout threshold', async () => {
            await registerUser(app, 'lockout@cinema.test');

            // Exhaust the lockout threshold (default: 5 failures)
            for (let i = 0; i < 5; i++) {
                await request(app.getHttpServer())
                    .post('/api/v1/auth/login')
                    .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                    .set('X-CSRF-Token', CSRF_VALUE)
                    .send({ email: 'lockout@cinema.test', password: 'WrongPass1!' });
            }

            // The 6th attempt should trigger the lockout
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send({ email: 'lockout@cinema.test', password: 'SecretPass1!' });

            expect(res.status).toBe(429);
            expect(res.body.errorCode).toBe(429);
        });
    });

    // ── POST /api/v1/auth/refresh ────────────────────────────────────────────

    describe('Refresh, Given:Valid refresh_token cookie and CSRF, When:Refreshing', () => {
        it('should return 200 with user profile and rotate cookies', async () => {
            const { cookies, csrfToken } = await registerUser(app, 'refresh-user@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `${cookieHeader}; csrf_token=${csrfToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send();

            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('refresh-user@cinema.test');

            const newCookies = parseCookies(res);
            expect(findCookie(newCookies, 'access_token')).toBeDefined();
            expect(findCookie(newCookies, 'refresh_token')).toBeDefined();
        });

        it('should issue a new refresh_token (token rotation)', async () => {
            const { cookies, csrfToken } = await registerUser(app, 'rotation@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);
            const oldRefresh = findCookie(cookies, 'refresh_token')!;
            const oldRefreshValue = extractCookieValue(oldRefresh);

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `${cookieHeader}; csrf_token=${csrfToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send();

            const newCookies = parseCookies(res);
            const newRefresh = findCookie(newCookies, 'refresh_token')!;
            const newRefreshValue = extractCookieValue(newRefresh);
            // The new token must differ from the original
            expect(newRefreshValue).not.toBe(oldRefreshValue);
        });
    });

    describe('Refresh, Given:Missing refresh_token cookie, When:Refreshing', () => {
        it('should return 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send();

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
        });
    });

    describe('Refresh, Given:Unknown (random garbage) refresh_token cookie, When:Refreshing', () => {
        it('should return 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `csrf_token=${CSRF_VALUE}; refresh_token=totalgarbage`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send();

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
        });
    });

    describe('Refresh, Given:Missing X-CSRF-Token header, When:Refreshing', () => {
        it('should return 403', async () => {
            const { cookies } = await registerUser(app, 'refresh-csrf@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', cookieHeader)
                .send();

            expect(res.status).toBe(403);
        });
    });

    describe('Refresh, Given:A reused (already-rotated) refresh token, When:Refreshing', () => {
        it('should return 401 and revoke the entire family (reuse detection)', async () => {
            // Step 1: register and capture rt0
            const { cookies: cookies0 } = await registerUser(app, 'reuse@cinema.test');
            // Extract only the auth tokens (not csrf) for controlled cookie merging
            const rt0Line = findCookie(cookies0, 'refresh_token')!;
            const at0Line = findCookie(cookies0, 'access_token')!;
            const rt0Value = extractCookieValue(rt0Line);
            const at0Value = extractCookieValue(at0Line);

            // Step 2: refresh rt0 → rt1 (rt0 is now revoked)
            // Use a fresh CSRF pair so the guard passes cleanly.
            const freshCsrf = 'fresh-csrf-for-reuse-test';
            const refreshRes = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `access_token=${at0Value}; refresh_token=${rt0Value}; csrf_token=${freshCsrf}`)
                .set('X-CSRF-Token', freshCsrf)
                .send()
                .expect(200);

            const cookies1 = parseCookies(refreshRes);
            const rt1Line = findCookie(cookies1, 'refresh_token')!;
            const at1Line = findCookie(cookies1, 'access_token')!;
            const rt1Value = extractCookieValue(rt1Line);
            const at1Value = extractCookieValue(at1Line);

            // Step 3: replay rt0 (already revoked) — triggers reuse detection
            const csrf2 = 'csrf-for-reuse-replay';
            const reuseRes = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `access_token=${at0Value}; refresh_token=${rt0Value}; csrf_token=${csrf2}`)
                .set('X-CSRF-Token', csrf2)
                .send();

            expect(reuseRes.status).toBe(401);
            expect(reuseRes.body.errorCode).toBe(401);

            // Step 4: now try rt1 — the whole family should be dead after reuse detection
            const csrf3 = 'csrf-for-family-dead-check';
            const familyDeadRes = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `access_token=${at1Value}; refresh_token=${rt1Value}; csrf_token=${csrf3}`)
                .set('X-CSRF-Token', csrf3)
                .send();

            expect(familyDeadRes.status).toBe(401);
            expect(familyDeadRes.body.errorCode).toBe(401);
        });
    });

    // ── POST /api/v1/auth/logout ─────────────────────────────────────────────

    describe('Logout, Given:Authenticated user with valid access_token cookie, When:Logging out', () => {
        it('should return 204 with cleared auth cookies (Max-Age=0)', async () => {
            const { cookies, csrfToken } = await registerUser(app, 'logout@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Cookie', `${cookieHeader}; csrf_token=${csrfToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send();

            expect(res.status).toBe(204);

            const setCookies = parseCookies(res);
            const clearedAccess = findCookie(setCookies, 'access_token');
            const clearedRefresh = findCookie(setCookies, 'refresh_token');

            // Cleared cookies are either empty value or have Max-Age=0
            expect(
                clearedAccess === undefined || /max-age=0/i.test(clearedAccess) || /access_token=;/.test(clearedAccess)
            ).toBe(true);
            expect(
                clearedRefresh === undefined ||
                    /max-age=0/i.test(clearedRefresh) ||
                    /refresh_token=;/.test(clearedRefresh)
            ).toBe(true);
        });

        it('should revoke the refresh token family so refresh returns 401 afterwards', async () => {
            const { cookies, csrfToken } = await registerUser(app, 'logout-revoke@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Cookie', `${cookieHeader}; csrf_token=${csrfToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send()
                .expect(204);

            // Attempt to use the old refresh token — must fail
            const refreshAfterLogout = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .set('Cookie', `${cookieHeader}; csrf_token=${csrfToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send();

            expect(refreshAfterLogout.status).toBe(401);
        });
    });

    describe('Logout, Given:No access_token cookie (unauthenticated), When:Logging out', () => {
        it('should return 401', async () => {
            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Cookie', `csrf_token=${CSRF_VALUE}`)
                .set('X-CSRF-Token', CSRF_VALUE)
                .send();

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
        });
    });

    describe('Logout, Given:Missing X-CSRF-Token header, When:Logging out', () => {
        it('should return 403', async () => {
            const { cookies } = await registerUser(app, 'logout-csrf@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            const res = await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .set('Cookie', cookieHeader)
                .send();

            expect(res.status).toBe(403);
        });
    });

    // ── GET /api/v1/auth/me ──────────────────────────────────────────────────

    describe('Me, Given:Authenticated user with valid access_token cookie, When:Fetching profile', () => {
        it('should return 200 with the user profile', async () => {
            const { cookies } = await registerUser(app, 'me@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            const res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookieHeader);

            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('me@cinema.test');
            expect(res.body.user.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(res.body.user.createdAt).toBeDefined();
        });
    });

    describe('Me, Given:No access_token cookie (unauthenticated), When:Fetching profile', () => {
        it('should return 401', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/auth/me');

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
        });
    });

    describe('Me, Given:Bearer token (fallback transport), When:Fetching profile', () => {
        it('should return 200 — Bearer is accepted as a fallback', async () => {
            const { cookies } = await registerUser(app, 'bearer@cinema.test');
            // Extract the raw JWT from the access_token cookie
            const accessLine = findCookie(cookies, 'access_token')!;
            const jwt = extractCookieValue(accessLine);

            const res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${jwt}`);

            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe('bearer@cinema.test');
        });
    });

    // ── GET /api/v1/auth/validate ────────────────────────────────────────────

    describe('Validate, Given:Authenticated user with valid access_token cookie, When:Validating', () => {
        it('should return 200 with userId and email', async () => {
            const { cookies } = await registerUser(app, 'validate@cinema.test');
            const cookieHeader = buildCookieHeader(cookies);

            const res = await request(app.getHttpServer()).get('/api/v1/auth/validate').set('Cookie', cookieHeader);

            expect(res.status).toBe(200);
            expect(res.body.userId).toBeDefined();
            expect(res.body.email).toBe('validate@cinema.test');
        });
    });

    describe('Validate, Given:No access_token cookie (unauthenticated), When:Validating', () => {
        it('should return 401', async () => {
            const res = await request(app.getHttpServer()).get('/api/v1/auth/validate');

            expect(res.status).toBe(401);
            expect(res.body.errorCode).toBe(401);
        });
    });
});
