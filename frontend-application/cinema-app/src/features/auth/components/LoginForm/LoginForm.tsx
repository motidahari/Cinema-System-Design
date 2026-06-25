// React
import { useState } from 'react';
import type { FormEvent } from 'react';

// MUI
import { Box, Link, Typography } from '@mui/material';

// Components
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';

// Hooks
import { useAuth } from '../../hooks/useAuth';

export interface LoginFormProps {
    // Optional hook for the parent view to switch to the register screen. When omitted
    // the "no account" prompt is not rendered, keeping the form usable in isolation.
    onSwitchToRegister?: () => void;
}

// Credentials form for the login view. Owns only the field state; all auth side effects
// (cookies, error toasts) live in useAuth/useAuthStore so the form stays presentational.
export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        await login({ email, password });
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            <Typography variant="h5" component="h1">
                Login
            </Typography>

            <Input
                id="login-email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
            />

            <Input
                id="login-password"
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
            />

            <Button type="submit" loading={isLoading} fullWidth>
                Sign In
            </Button>

            {onSwitchToRegister && (
                <Typography variant="body2">
                    Don&apos;t have an account?{' '}
                    <Link component="button" type="button" onClick={onSwitchToRegister}>
                        Create Account
                    </Link>
                </Typography>
            )}
        </Box>
    );
}
