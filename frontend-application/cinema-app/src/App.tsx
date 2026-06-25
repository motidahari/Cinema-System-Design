import { useEffect } from 'react';

export default function App() {
    useEffect(() => {
        // restoreSession() will be wired to useAuthStore in B28
    }, []);

    return (
        <div id="app">
            <h1>Cinema Reservation System</h1>
        </div>
    );
}
