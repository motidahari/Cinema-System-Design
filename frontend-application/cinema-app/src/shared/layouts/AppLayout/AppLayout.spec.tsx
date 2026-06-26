import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './AppLayout';

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '@/features/auth/hooks/useAuth';

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const logout = vi.fn();

function setAuth(user: { id: string; email: string; createdAt: string } | null): void {
    useAuthMock.mockReturnValue({
        user,
        logout,
        login: vi.fn(),
        register: vi.fn(),
        isAuthenticated: user !== null,
        isLoading: false,
        error: null,
    });
}

function renderLayout() {
    return render(
        <MemoryRouter initialEntries={['/cinema']}>
            <Routes>
                <Route path="/cinema" element={<AppLayout />}>
                    <Route index element={<div>Cinema Child View</div>} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

describe('AppLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setAuth({ id: 'u1', email: 'alice@example.com', createdAt: 'now' });
    });

    it('renders the app title and the routed child view', () => {
        renderLayout();

        expect(screen.getByRole('heading', { name: /Cinema Reservation/ })).toBeInTheDocument();
        expect(screen.getByText('Cinema Child View')).toBeInTheDocument();
    });

    it('shows the current user email', () => {
        renderLayout();

        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('calls logout when the logout button is clicked', async () => {
        renderLayout();

        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

        expect(logout).toHaveBeenCalledTimes(1);
    });

    it('omits the email line when there is no user', () => {
        setAuth(null);
        renderLayout();

        expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });
});
