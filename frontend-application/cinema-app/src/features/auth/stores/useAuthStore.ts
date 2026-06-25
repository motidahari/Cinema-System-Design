import { create } from 'zustand';
import { authService } from '../services/AuthService';
import { isApiError } from '@/core/types/api-error';
import type { UserDto } from '../types';

// No token in state — the SPA can't read httpOnly cookies. Auth is DERIVED from
// whether GET /auth/me succeeds; `isAuthenticated` simply tracks `user !== null`.
//
// It is kept as an explicit boolean (updated on every user change) rather than a
// getter: Zustand's `set` spreads state, which would snapshot a getter into a stale
// static value after the first update.
interface AuthState {
    user: UserDto | null;
    isLoading: boolean;
    isInitialized: boolean; // has restoreSession run at least once?
    error: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    restoreSession: () => Promise<void>;
    clearSession: () => void; // local-only reset (used by the 401 interceptor / logout)
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoading: false,
    isInitialized: false,
    error: null,
    isAuthenticated: false,

    async login(email, password) {
        set({ isLoading: true, error: null });
        try {
            const { user } = await authService.login({ email, password });
            set({ user, isAuthenticated: true, isLoading: false }); // cookies were set server-side
        } catch (err) {
            const msg = isApiError(err) ? (err.response?.data?.errorMessage ?? 'Login failed') : 'Login failed';
            set({ error: msg, isLoading: false });
            throw err;
        }
    },

    async register(email, password) {
        set({ isLoading: true, error: null });
        try {
            // register auto-logs-in (sets cookies) and returns the user.
            const { user } = await authService.register({ email, password });
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (err) {
            const msg = isApiError(err)
                ? (err.response?.data?.errorMessage ?? 'Registration failed')
                : 'Registration failed';
            set({ error: msg, isLoading: false });
            throw err;
        }
    },

    async logout() {
        try {
            await authService.logout(); // revokes refresh family + clears cookies
        } finally {
            get().clearSession();
            window.location.href = '/login';
        }
    },

    // Run once on app start: ask the server who we are. The access_token cookie is
    // sent automatically; a 401 transparently triggers a refresh in BaseHttpService.
    async restoreSession() {
        set({ isLoading: true });
        try {
            const { user } = await authService.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
        }
    },

    clearSession() {
        set({ user: null, isAuthenticated: false, error: null });
    },
}));
