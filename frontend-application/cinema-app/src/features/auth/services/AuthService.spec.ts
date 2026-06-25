import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService';
import type { UserDto } from '../types';

const user: UserDto = { id: 'u1', email: 'alice@example.com', createdAt: '2026-06-21T10:00:00.000Z' };

// Replace the inherited axios client with a stub so we assert endpoint mapping only;
// the CSRF/refresh behaviour is covered by BaseHttpService's own spec.
function makeService() {
    const post = vi.fn();
    const get = vi.fn();
    const service = new AuthService();
    (service as unknown as { http: { post: typeof post; get: typeof get } }).http = { post, get };
    return { service, post, get };
}

describe('AuthService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('login', () => {
        it('POSTs credentials to /auth/login and returns the user payload', async () => {
            const { service, post } = makeService();
            post.mockResolvedValue({ data: { user } });

            const result = await service.login({ email: 'alice@example.com', password: 'SecretPass1!' });

            expect(post).toHaveBeenCalledWith('/auth/login', { email: 'alice@example.com', password: 'SecretPass1!' });
            expect(result).toEqual({ user });
        });
    });

    describe('register', () => {
        it('POSTs credentials to /auth/register and returns the user payload', async () => {
            const { service, post } = makeService();
            post.mockResolvedValue({ data: { user } });

            const result = await service.register({ email: 'alice@example.com', password: 'SecretPass1!' });

            expect(post).toHaveBeenCalledWith('/auth/register', {
                email: 'alice@example.com',
                password: 'SecretPass1!',
            });
            expect(result).toEqual({ user });
        });
    });

    describe('logout', () => {
        it('POSTs to /auth/logout', async () => {
            const { service, post } = makeService();
            post.mockResolvedValue({ data: undefined });

            await service.logout();

            expect(post).toHaveBeenCalledWith('/auth/logout');
        });
    });

    describe('getCurrentUser', () => {
        it('GETs /auth/me and returns the user payload', async () => {
            const { service, get } = makeService();
            get.mockResolvedValue({ data: { user } });

            const result = await service.getCurrentUser();

            expect(get).toHaveBeenCalledWith('/auth/me');
            expect(result).toEqual({ user });
        });
    });
});
