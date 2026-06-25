import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from './RegisterForm';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../../hooks/useAuth';

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const register = vi.fn();

function setAuth(overrides: { isLoading?: boolean } = {}): void {
    useAuthMock.mockReturnValue({
        login: vi.fn(),
        register,
        logout: vi.fn(),
        user: null,
        isAuthenticated: false,
        isLoading: overrides.isLoading ?? false,
        error: null,
    });
}

describe('RegisterForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        register.mockResolvedValue(undefined);
        setAuth();
    });

    it('renders email, password, confirm password and a submit button', () => {
        render(<RegisterForm />);

        expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Confirm Password/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('submits email and password to useAuth.register when passwords match', async () => {
        render(<RegisterForm />);

        await userEvent.type(screen.getByLabelText(/^Email/), 'alice@example.com');
        await userEvent.type(screen.getByLabelText(/^Password/), 'secret123');
        await userEvent.type(screen.getByLabelText(/^Confirm Password/), 'secret123');
        await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        expect(register).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'secret123' });
    });

    it('blocks submission and shows an error when passwords do not match', async () => {
        render(<RegisterForm />);

        await userEvent.type(screen.getByLabelText(/^Email/), 'alice@example.com');
        await userEvent.type(screen.getByLabelText(/^Password/), 'secret123');
        await userEvent.type(screen.getByLabelText(/^Confirm Password/), 'different');
        await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        expect(register).not.toHaveBeenCalled();
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('disables the submit button while loading', () => {
        setAuth({ isLoading: true });
        render(<RegisterForm />);

        expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled();
    });

    it('invokes onSwitchToLogin when the prompt link is clicked', async () => {
        const onSwitchToLogin = vi.fn();
        render(<RegisterForm onSwitchToLogin={onSwitchToLogin} />);

        await userEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
    });
});
