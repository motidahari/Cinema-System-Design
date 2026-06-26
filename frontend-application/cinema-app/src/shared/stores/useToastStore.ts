import { create } from 'zustand';
import { ToastSeverity } from '@/shared/enums';

interface ToastState {
    open: boolean;
    message: string;
    severity: ToastSeverity;
    showToast: (message: string, severity?: ToastSeverity) => void;
    closeToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    open: false,
    message: '',
    severity: ToastSeverity.Info,
    showToast: (message, severity = ToastSeverity.Info) => set({ open: true, message, severity }),
    closeToast: () => set((s) => ({ ...s, open: false })),
}));
