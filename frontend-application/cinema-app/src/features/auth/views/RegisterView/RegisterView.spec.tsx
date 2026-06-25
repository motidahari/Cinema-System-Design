import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterView from './RegisterView';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../../hooks/useAuth';

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;

describe('RegisterView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthMock.mockReturnValue({
            login: vi.fn(),
            register: vi.fn().mockResolvedValue(undefined),
            logout: vi.fn(),
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
    });

    it('renders the register form', () => {
        render(<RegisterView />);

        expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('navigates to /login when the have-account link is clicked', async () => {
        render(<RegisterView />);

        await userEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(navigate).toHaveBeenCalledWith('/login');
    });
});
