// MUI
import { Alert, Snackbar } from '@mui/material';

// Hooks
import type { ToastSeverity } from '@/shared/hooks/useToast';

export interface ToastProps {
    open: boolean;
    message: string;
    severity?: ToastSeverity;
    autoHideDuration?: number;
    onClose: () => void;
}

const DEFAULT_AUTO_HIDE_MS = 5000;
const ANCHOR = { vertical: 'bottom', horizontal: 'center' } as const;

// Presentational toast: a controlled MUI Snackbar + Alert driven entirely by props.
// State (open/message/severity) lives in the `useToast` hook so a single instance can
// be mounted once at the app root and reused everywhere.
export default function Toast({
    open,
    message,
    severity = 'info',
    autoHideDuration = DEFAULT_AUTO_HIDE_MS,
    onClose,
}: ToastProps) {
    return (
        <Snackbar open={open} autoHideDuration={autoHideDuration} onClose={onClose} anchorOrigin={ANCHOR}>
            <Alert severity={severity} variant="filled" onClose={onClose} sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
}
