// React Router
import { Outlet } from 'react-router-dom';

// MUI
import { Box, Container, Paper } from '@mui/material';

// Centered, card-style shell for the guest auth views (login / register). Renders the
// active auth view through <Outlet>; no header/nav since the user is signed out.
export default function AuthLayout() {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Container maxWidth="xs" disableGutters>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Outlet />
                </Paper>
            </Container>
        </Box>
    );
}
