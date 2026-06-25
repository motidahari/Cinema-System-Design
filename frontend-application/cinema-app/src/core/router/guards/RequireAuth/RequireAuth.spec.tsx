import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireGuest } from './RequireAuth';

vi.mock('@/features/auth/stores/useAuthStore', () => ({ useAuthStore: vi.fn() }));

import { useAuthStore } from '@/features/auth/stores/useAuthStore';

const useAuthStoreMock = useAuthStore as unknown as ReturnType<typeof vi.fn>;

function setAuth(state: { isAuthenticated: boolean; isInitialized: boolean }): void {
    useAuthStoreMock.mockReturnValue(state);
}

function renderGuarded(Guard: typeof RequireAuth, initialPath: string) {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route element={<Guard />}>
                    <Route path="/private" element={<div>Private</div>} />
                    <Route path="/guest" element={<div>Guest</div>} />
                </Route>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/cinema" element={<div>Cinema Page</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('RequireAuth', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows a loader while the session is still initializing', () => {
        setAuth({ isAuthenticated: false, isInitialized: false });
        renderGuarded(RequireAuth, '/private');

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.queryByText('Private')).not.toBeInTheDocument();
    });

    it('renders the protected outlet when authenticated', () => {
        setAuth({ isAuthenticated: true, isInitialized: true });
        renderGuarded(RequireAuth, '/private');

        expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('redirects to /login when not authenticated', () => {
        setAuth({ isAuthenticated: false, isInitialized: true });
        renderGuarded(RequireAuth, '/private');

        expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
});

describe('RequireGuest', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows a loader while the session is still initializing', () => {
        setAuth({ isAuthenticated: false, isInitialized: false });
        renderGuarded(RequireGuest, '/guest');

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders the guest outlet when not authenticated', () => {
        setAuth({ isAuthenticated: false, isInitialized: true });
        renderGuarded(RequireGuest, '/guest');

        expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('redirects to /cinema when already authenticated', () => {
        setAuth({ isAuthenticated: true, isInitialized: true });
        renderGuarded(RequireGuest, '/guest');

        expect(screen.getByText('Cinema Page')).toBeInTheDocument();
    });
});
