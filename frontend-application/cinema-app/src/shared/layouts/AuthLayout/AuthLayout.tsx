import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';

export default function AuthLayout() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                background: 'linear-gradient(135deg, #0d0d2b 0%, #1a237e 50%, #4a148c 100%)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 60%)',
                    animation: 'slowRotate 20s linear infinite',
                },
            }}
        >
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                <LanguageSwitcher color="inherit" />
            </Box>

            <Typography
                variant="h4"
                sx={{
                    mb: 4,
                    fontWeight: 800,
                    letterSpacing: 2,
                    color: 'rgba(255,255,255,0.95)',
                    textAlign: 'center',
                    textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                }}
            >
                🎬 Cinema
            </Typography>

            <Container maxWidth="xs" disableGutters>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.5, sm: 4 },
                        backdropFilter: 'blur(20px)',
                        background: 'rgba(255,255,255,0.97)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        animation: 'fadeSlideUp 0.4s ease-out',
                    }}
                >
                    <Outlet />
                </Paper>
            </Container>
        </Box>
    );
}
