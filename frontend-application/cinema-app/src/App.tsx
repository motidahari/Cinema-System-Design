import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { router } from './core/router';
import { useAuthStore } from './features/auth/stores/useAuthStore';
import { useToast } from './shared/hooks/useToast';
import Toast from './shared/components/Toast';

const theme = createTheme({
    palette: {
        primary: { main: '#1a237e' },
        secondary: { main: '#e91e63' },
        background: { default: '#f5f5f5' },
    },
    shape: { borderRadius: 8 },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600 },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: { borderRadius: 12 },
            },
        },
    },
});

// App root: initialises theme, restores session once on mount, mounts the global toast.
export default function App() {
    const restoreSession = useAuthStore((state) => state.restoreSession);
    const { toast, closeToast } = useToast();

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={router} />
            <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={closeToast} />
        </ThemeProvider>
    );
}
