import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';
import { useAuth } from '../../hooks/useAuth';

export interface RegisterFormProps {
    onSwitchToLogin?: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
    const { t } = useTranslation();
    const { register, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mismatch, setMismatch] = useState(false);

    // Debounce mismatch detection so feedback only shows after the user pauses typing.
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
            <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
                {t('auth.register')}
            </Typography>

            <Input
                id="register-email"
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
            />

            <Input
                id="register-password"
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
            />

            <Input
                id="register-confirm-password"
                label={t('auth.confirmPassword')}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                autoComplete="new-password"
                error={mismatch}
                helperText={mismatch ? t('auth.passwordMismatch') : undefined}
            />

            <Button type="submit" loading={isLoading} fullWidth sx={{ mt: 1 }}>
                {t('auth.registerButton')}
            </Button>

            {onSwitchToLogin && (
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    {t('auth.haveAccount')}{' '}
                    <Link component="button" type="button" onClick={onSwitchToLogin} fontWeight={600}>
                        {t('auth.login')}
                    </Link>
                </Typography>
            )}
        </Box>
    );
}
