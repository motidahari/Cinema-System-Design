import { Navigate, Outlet } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';

// Guards wait for `isInitialized` before deciding — auth is derived from GET /auth/me
// since the access token is an httpOnly cookie JS cannot read directly.
export function RequireAuth() {
    const { isAuthenticated, isInitialized } = useAuthStore();
    if (!isInitialized) return <CircularProgress />;
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RequireGuest() {
    const { isAuthenticated, isInitialized } = useAuthStore();
    if (!isInitialized) return <CircularProgress />;
    return isAuthenticated ? <Navigate to="/cinema" replace /> : <Outlet />;
}
