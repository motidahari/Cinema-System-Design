import { useState } from 'react';
import type { FormEvent } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';
import { useAuth } from '../../hooks/useAuth';

export interface LoginFormProps {
    onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
    const { t } = useTranslation();
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
            <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
                {t('auth.login')}
            </Typography>

            <Input
                id="login-email"
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
            />

            <Input
                id="login-password"
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
            />

            <Button type="submit" loading={isLoading} fullWidth sx={{ mt: 1 }}>
                {t('auth.loginButton')}
            </Button>

            {onSwitchToRegister && (
                <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    {t('auth.noAccount')}{' '}
                    <Link component="button" type="button" onClick={onSwitchToRegister} fontWeight={600}>
                        {t('auth.registerButton')}
                    </Link>
                </Typography>
            )}
        </Box>
    );
}
