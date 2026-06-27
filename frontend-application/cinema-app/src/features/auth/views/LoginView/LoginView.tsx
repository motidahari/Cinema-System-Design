import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm';

// Login route (`/login`, behind <RequireGuest>). The view owns navigation: it wires the
// form's "create account" prompt to the /register route, keeping LoginForm presentational
// and free of router concerns. Successful login redirects via the auth store + guards.
export default function LoginView() {
    const navigate = useNavigate();

    return <LoginForm onSwitchToRegister={() => navigate('/register')} />;
}
