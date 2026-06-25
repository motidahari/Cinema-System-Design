import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '../../hooks/useAuth';

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const login = vi.fn();

function setAuth(overrides: { isLoading?: boolean } = {}): void {
    useAuthMock.mockReturnValue({
        login,
        register: vi.fn(),
        logout: vi.fn(),
        user: null,
        isAuthenticated: false,
        isLoading: overrides.isLoading ?? false,
        error: null,
    });
}

describe('LoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        login.mockResolvedValue(undefined);
        setAuth();
    });

    it('renders email, password and a submit button', () => {
        render(<LoginForm />);

        expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('submits the typed credentials to useAuth.login', async () => {
        render(<LoginForm />);

        await userEvent.type(screen.getByLabelText(/^Email/), 'alice@example.com');
        await userEvent.type(screen.getByLabelText(/^Password/), 'secret123');
        await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

        expect(login).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'secret123' });
    });

    it('disables the submit button while loading', () => {
        setAuth({ isLoading: true });
        render(<LoginForm />);

        expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
    });

    it('does not render the switch link without a handler', () => {
        render(<LoginForm />);

        expect(screen.queryByRole('button', { name: 'Create Account' })).not.toBeInTheDocument();
    });

    it('invokes onSwitchToRegister when the prompt link is clicked', async () => {
        const onSwitchToRegister = vi.fn();
        render(<LoginForm onSwitchToRegister={onSwitchToRegister} />);

        await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        expect(onSwitchToRegister).toHaveBeenCalledTimes(1);
    });
});
