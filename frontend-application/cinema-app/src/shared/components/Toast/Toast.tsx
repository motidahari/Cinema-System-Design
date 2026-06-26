import { Slide } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { Alert, Snackbar } from '@mui/material';
import type { ToastSeverity } from '@/shared/hooks/useToast';

export interface ToastProps {
    open: boolean;
    message: string;
    severity?: ToastSeverity;
    autoHideDuration?: number;
    onClose: () => void;
}

const DEFAULT_AUTO_HIDE_MS = 5000;
const ANCHOR = { vertical: 'bottom', horizontal: 'right' } as const;

function SlideTransition(props: TransitionProps & { children: React.ReactElement }) {
    return <Slide {...props} direction="left" />;
}

// Presentational toast: a controlled MUI Snackbar + Alert driven entirely by props.
// Backed by the global useToastStore so a single instance mounted at the app root
// serves every callsite.
export default function Toast({
    open,
    message,
    severity = 'info',
    autoHideDuration = DEFAULT_AUTO_HIDE_MS,
    onClose,
}: ToastProps) {
    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={onClose}
            anchorOrigin={ANCHOR}
            TransitionComponent={SlideTransition}
            sx={{ mb: 2, mr: 2 }}
        >
            <Alert
                severity={severity}
                variant="filled"
                onClose={onClose}
                sx={{
                    width: '100%',
                    minWidth: 280,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    borderRadius: 2,
                    fontWeight: 500,
                }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}
