import { useAuthStore } from '../stores/useAuthStore';
import { useToast } from '@/shared/hooks/useToast';
import type { LoginDto, RegisterDto } from '../types';

// Orchestration layer over the auth store — owns the user-facing toasts so the
// store stays free of UI concerns.
export function useAuth() {
    const store = useAuthStore();
    const { showToast } = useToast();

    const login = async (dto: LoginDto): Promise<void> => {
        try {
            await store.login(dto.email, dto.password);
        } catch {
            showToast(store.error ?? 'Login failed', 'error');
        }
    };

    const register = async (dto: RegisterDto): Promise<void> => {
        try {
            await store.register(dto.email, dto.password);
            showToast('Account created successfully', 'success');
        } catch {
            showToast(store.error ?? 'Registration failed', 'error');
        }
    };

    return {
        user: store.user,
        isAuthenticated: store.isAuthenticated,
        isLoading: store.isLoading,
        error: store.error,
        login,
        register,
        logout: store.logout,
    };
}
