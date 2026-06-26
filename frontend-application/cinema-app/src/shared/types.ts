// Shared UI types.
import type { ToastSeverity } from './enums';

export interface Toast {
    open: boolean;
    message: string;
    severity: ToastSeverity;
}
