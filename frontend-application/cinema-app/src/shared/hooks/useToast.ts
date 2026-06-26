import { useToastStore } from '@/shared/stores/useToastStore';

export type { ToastSeverity } from '@/shared/stores/useToastStore';

export interface Toast {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
}

// Thin hook wrapper over the global toast Zustand store. Backed by a singleton so any
// component calling showToast displays in the single <Toast> mounted at the app root.
export function useToast() {
    const open = useToastStore((s) => s.open);
    const message = useToastStore((s) => s.message);
    const severity = useToastStore((s) => s.severity);
    const showToast = useToastStore((s) => s.showToast);
    const closeToast = useToastStore((s) => s.closeToast);

    return { toast: { open, message, severity }, showToast, closeToast };
}
