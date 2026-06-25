import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './core/router';
import { useAuthStore } from './features/auth/stores/useAuthStore';

// App root: derives the session once on mount (GET /auth/me via restoreSession) so the
// route guards have an `isInitialized` answer before they decide, then hands the whole
// SPA over to the router. Auth is cookie-derived — there is no token to read from JS.
export default function App() {
    const restoreSession = useAuthStore((state) => state.restoreSession);

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    return <RouterProvider router={router} />;
}
