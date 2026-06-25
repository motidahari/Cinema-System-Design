// React Router
import { Navigate, Outlet } from 'react-router-dom';

// MUI
import { CircularProgress } from '@mui/material';

// Stores
import { useAuthStore } from '@/features/auth/stores/useAuthStore';

// Auth is DERIVED from GET /auth/me (the access token is an httpOnly cookie JS can't
// read), so the guards wait for `isInitialized` — set once restoreSession() resolves —
// before deciding, to avoid flashing /login during the initial /me round-trip.

// Gate for authenticated-only routes (e.g. /cinema).
export function RequireAuth() {
    const { isAuthenticated, isInitialized } = useAuthStore();
    if (!isInitialized) return <CircularProgress />;
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Gate for guest-only routes (e.g. /login, /register) — bounces signed-in users away.
export function RequireGuest() {
    const { isAuthenticated, isInitialized } = useAuthStore();
    if (!isInitialized) return <CircularProgress />;
    return isAuthenticated ? <Navigate to="/cinema" replace /> : <Outlet />;
}
