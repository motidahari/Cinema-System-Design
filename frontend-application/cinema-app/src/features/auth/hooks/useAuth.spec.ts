import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../stores/useAuthStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/shared/hooks/useToast', () => ({ useToast: vi.fn() }));

import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '@/shared/hooks/useToast';

const useAuthStoreMock = useAuthStore as unknown as ReturnType<typeof vi.fn>;
const useToastMock = useToast as unknown as ReturnType<typeof vi.fn>;

const showToast = vi.fn();

interface FakeStore {
    user: { id: string; email: string; createdAt: string } | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
}

function setStore(overrides: Partial<FakeStore> = {}): FakeStore {
    const store: FakeStore = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn(),
        ...overrides,
    };
    useAuthStoreMock.mockReturnValue(store);
    return store;
}

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useToastMock.mockReturnValue({
            showToast,
            toast: { open: false, message: '', severity: 'info' },
            closeToast: vi.fn(),
        });
    });

    describe('login', () => {
        it('delegates email/password to the store', async () => {
            const store = setStore();
            const { result } = renderHook(() => useAuth());

            await result.current.login({ email: 'alice@example.com', password: 'pw' });

            expect(store.login).toHaveBeenCalledWith('alice@example.com', 'pw');
            expect(showToast).not.toHaveBeenCalled();
        });

        it('shows an error toast with the store message on failure', async () => {
            setStore({ login: vi.fn().mockRejectedValue(new Error('x')), error: 'Invalid email or password' });
            const { result } = renderHook(() => useAuth());

            await result.current.login({ email: 'a@b.com', password: 'pw' });

            expect(showToast).toHaveBeenCalledWith('Invalid email or password', 'error');
        });
    });

    describe('register', () => {
        it('shows a success toast on success', async () => {
            const store = setStore();
            const { result } = renderHook(() => useAuth());

            await result.current.register({ email: 'a@b.com', password: 'pw' });

            expect(store.register).toHaveBeenCalledWith('a@b.com', 'pw');
            expect(showToast).toHaveBeenCalledWith('Account created successfully', 'success');
        });

        it('shows an error toast on failure', async () => {
            setStore({ register: vi.fn().mockRejectedValue(new Error('x')), error: 'Email already registered' });
            const { result } = renderHook(() => useAuth());

            await result.current.register({ email: 'a@b.com', password: 'pw' });

            expect(showToast).toHaveBeenCalledWith('Email already registered', 'error');
        });
    });

    describe('derived values', () => {
        it('exposes the store user, auth flag and logout', () => {
            const store = setStore({ user: { id: 'u1', email: 'a@b.com', createdAt: 'now' }, isAuthenticated: true });
            const { result } = renderHook(() => useAuth());

            expect(result.current.user).toEqual(store.user);
            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.logout).toBe(store.logout);
        });
    });
});
