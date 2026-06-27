import { Outlet } from 'react-router-dom';
import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AppLayout() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #0d0d2b 0%, #1a237e 60%, #283593 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Toolbar sx={{ gap: { xs: 0.5, sm: 1 }, px: { xs: 1.5, sm: 3 } }}>
                    <Typography
                        variant="h6"
                        component="h1"
                        noWrap
                        sx={{
                            flexGrow: 1,
                            fontWeight: 800,
                            letterSpacing: { xs: 0.5, sm: 1.5 },
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            background: 'linear-gradient(90deg, #ffffff, #90caf9)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        🎬 {t('cinema.title')}
                    </Typography>

                    {user && (
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '0.8rem',
                                display: { xs: 'none', sm: 'block' },
                            }}
                        >
                            {user.email}
                        </Typography>
                    )}

                    <LanguageSwitcher color="inherit" />

                    <Button
                        variant="text"
                        color="inherit"
                        onClick={logout}
                        sx={{ ml: 0.5, opacity: 0.85, '&:hover': { opacity: 1 } }}
                    >
                        {t('auth.logoutButton')}
                    </Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Outlet />
            </Box>
        </Box>
    );
}
