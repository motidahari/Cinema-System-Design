// React Router
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Guards & layouts
import { RequireAuth, RequireGuest } from './guards/RequireAuth';
import AuthLayout from '@/shared/layouts/AuthLayout';
import AppLayout from '@/shared/layouts/AppLayout';

// Placeholder view slots. The real views land in later branches — LoginView /
// RegisterView in B32, CinemaView in B36 — and simply replace these elements without
// touching the guard/layout wiring established here.
const LoginViewSlot = <p>Login view (B32)</p>;
const RegisterViewSlot = <p>Register view (B32)</p>;
const CinemaViewSlot = <p>Cinema view (B36)</p>;

// Route map (FRONTEND-DESIGN §8): guest-only auth routes behind <RequireGuest>, the
// authenticated cinema route behind <RequireAuth>; "/" redirects into the app.
export const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/cinema" replace /> },
    {
        element: <RequireGuest />,
        children: [
            { path: '/login', element: <AuthLayout />, children: [{ index: true, element: LoginViewSlot }] },
            { path: '/register', element: <AuthLayout />, children: [{ index: true, element: RegisterViewSlot }] },
        ],
    },
    {
        element: <RequireAuth />,
        children: [{ path: '/cinema', element: <AppLayout />, children: [{ index: true, element: CinemaViewSlot }] }],
    },
]);
