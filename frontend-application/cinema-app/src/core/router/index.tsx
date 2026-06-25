// React Router
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Guards & layouts
import { RequireAuth, RequireGuest } from './guards/RequireAuth';
import AuthLayout from '@/shared/layouts/AuthLayout';
import AppLayout from '@/shared/layouts/AppLayout';

// Views
import LoginView from '@/features/auth/views/LoginView';
import RegisterView from '@/features/auth/views/RegisterView';
import CinemaView from '@/features/cinema/views/CinemaView';

const LoginViewSlot = <LoginView />;
const RegisterViewSlot = <RegisterView />;
const CinemaViewSlot = <CinemaView />;

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
