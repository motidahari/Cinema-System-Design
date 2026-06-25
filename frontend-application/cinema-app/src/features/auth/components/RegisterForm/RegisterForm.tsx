// React
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

// MUI
import { Box, Link, Typography } from '@mui/material';

// Components
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';

// Hooks
import { useAuth } from '../../hooks/useAuth';

export interface RegisterFormProps {
    // Optional hook for the parent view to switch back to the login screen.
    onSwitchToLogin?: () => void;
}

// Sign-up form. Confirms the password client-side before delegating to useAuth; all
// server-side validation errors surface through the auth store's error toast.
export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
    const { register, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mismatch, setMismatch] = useState(false);

    // Reactively validate after 300 ms of idle typing so the user sees feedback
    // without triggering on every keystroke.
    useEffect(() => {
        if (!confirmPassword) return;
        const timer = setTimeout(() => {
            setMismatch(password !== confirmPassword);
        }, 300);
        return () => clearTimeout(timer);
    }, [password, confirmPassword]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (password !== confirmPassword) {
            setMismatch(true);
            return;
        }
        await register({ email, password });
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            <Typography variant="h5" component="h1">
                Register
            </Typography>

            <Input
                id="register-email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
            />

            <Input
                id="register-password"
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
            />

            <Input
                id="register-confirm-password"
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
                error={mismatch}
                helperText={mismatch ? 'Passwords do not match' : undefined}
            />

            <Button type="submit" loading={isLoading} fullWidth>
                Create Account
            </Button>

            {onSwitchToLogin && (
                <Typography variant="body2">
                    Already have an account?{' '}
                    <Link component="button" type="button" onClick={onSwitchToLogin}>
                        Login
                    </Link>
                </Typography>
            )}
        </Box>
    );
}
