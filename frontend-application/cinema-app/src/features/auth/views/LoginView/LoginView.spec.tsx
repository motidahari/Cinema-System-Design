import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginView from './LoginView';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

// The form's side effects (auth store) are exercised in LoginForm.spec; here we only
// verify the view composes the form and wires the "create account" link to /register.
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../../hooks/useAuth';

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;

describe('LoginView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthMock.mockReturnValue({
            login: vi.fn().mockResolvedValue(undefined),
            register: vi.fn(),
            logout: vi.fn(),
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
    });

    it('renders the login form', () => {
        render(<LoginView />);

        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('navigates to /register when the create-account link is clicked', async () => {
        render(<LoginView />);

        await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        expect(navigate).toHaveBeenCalledWith('/register');
    });
});
