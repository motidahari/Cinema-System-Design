// React Router
import { Outlet } from 'react-router-dom';

// MUI
import { AppBar, Box, Toolbar, Typography } from '@mui/material';

// Components
import Button from '@/shared/components/Button';

// Hooks
import { useAuth } from '@/features/auth/hooks/useAuth';

// Authenticated app shell: a top AppBar (title · current user · logout) over the routed
// content (the cinema view). Reads the user and logout from useAuth.
export default function AppLayout() {
    const { user, logout } = useAuth();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                        Cinema Reservation
                    </Typography>
                    {user && (
                        <Typography variant="body2" sx={{ marginInlineEnd: 2 }}>
                            {user.email}
                        </Typography>
                    )}
                    <Button variant="text" color="inherit" onClick={logout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Outlet />
            </Box>
        </Box>
    );
}
