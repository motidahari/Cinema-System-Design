import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import type { UserDto } from '../types';

// Mock the AuthService singleton the store depends on.
vi.mock('../services/AuthService', () => ({
    authService: {
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getCurrentUser: vi.fn(),
    },
}));

import { authService } from '../services/AuthService';

const mocked = authService as unknown as {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
};

const user: UserDto = { id: 'u1', email: 'alice@example.com', createdAt: '2026-06-21T10:00:00.000Z' };

function resetStore() {
    useAuthStore.setState({
        user: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        isAuthenticated: false,
    });
}

describe('useAuthStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('login', () => {
        it('stores the user and marks the session authenticated on success', async () => {
            mocked.login.mockResolvedValue({ user });

            await useAuthStore.getState().login('alice@example.com', 'SecretPass1!');

            const state = useAuthStore.getState();
            expect(state.user).toEqual(user);
            expect(state.isAuthenticated).toBe(true);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('captures the API error message and rethrows on failure', async () => {
            mocked.login.mockRejectedValue({ response: { data: { errorMessage: 'Invalid email or password' } } });

            await expect(useAuthStore.getState().login('alice@example.com', 'wrong')).rejects.toBeTruthy();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.error).toBe('Invalid email or password');
        });
    });

    describe('register', () => {
        it('auto-authenticates with the returned user on success', async () => {
            mocked.register.mockResolvedValue({ user });

            await useAuthStore.getState().register('alice@example.com', 'SecretPass1!');

            const state = useAuthStore.getState();
            expect(state.user).toEqual(user);
            expect(state.isAuthenticated).toBe(true);
        });

        it('falls back to a default message when the error is not an API error', async () => {
            mocked.register.mockRejectedValue(new Error('network'));

            await expect(useAuthStore.getState().register('a@b.com', 'x')).rejects.toBeTruthy();
            expect(useAuthStore.getState().error).toBe('Registration failed');
        });
    });

    describe('restoreSession', () => {
        it('derives an authenticated session from /auth/me and marks initialized', async () => {
            mocked.getCurrentUser.mockResolvedValue({ user });

            await useAuthStore.getState().restoreSession();

            const state = useAuthStore.getState();
            expect(state.user).toEqual(user);
            expect(state.isAuthenticated).toBe(true);
            expect(state.isInitialized).toBe(true);
        });

        it('marks initialized but unauthenticated when /auth/me fails', async () => {
            mocked.getCurrentUser.mockRejectedValue({ response: { status: 401 } });

            await useAuthStore.getState().restoreSession();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isInitialized).toBe(true);
        });
    });

    describe('clearSession', () => {
        it('resets user, auth flag and error locally', () => {
            useAuthStore.setState({ user, isAuthenticated: true, error: 'stale' });

            useAuthStore.getState().clearSession();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    describe('logout', () => {
        it('clears the session and redirects to /login even if the API call rejects', async () => {
            const originalLocation = window.location;
            Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
            useAuthStore.setState({ user, isAuthenticated: true });
            mocked.logout.mockRejectedValue(new Error('boom'));

            // logout uses try/finally (no catch), so it still clears + redirects but rethrows.
            await expect(useAuthStore.getState().logout()).rejects.toThrow('boom');

            expect(useAuthStore.getState().user).toBeNull();
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
            expect(window.location.href).toBe('/login');

            Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
        });
    });
});
