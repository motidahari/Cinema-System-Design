// React Router
import { useNavigate } from 'react-router-dom';

// Components
import RegisterForm from '../../components/RegisterForm';

// Register route (`/register`, behind <RequireGuest>). The view owns navigation: it wires
// the form's "already have an account" prompt to the /login route, keeping RegisterForm
// presentational. A successful sign-up auto-logs-in, and the guards redirect to /cinema.
export default function RegisterView() {
    const navigate = useNavigate();

    return <RegisterForm onSwitchToLogin={() => navigate('/login')} />;
}
