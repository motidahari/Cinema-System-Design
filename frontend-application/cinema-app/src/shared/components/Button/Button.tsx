import { forwardRef } from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import type { ButtonProps as MuiButtonProps } from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
    // When true, the button is disabled and shows an inline spinner in place of the
    // start icon — used while an async action (submit, reserve, confirm) is in flight.
    loading?: boolean;
}

// Thin wrapper over MUI's Button so the whole SPA shares one button contract
// (default `contained` variant + a `loading` affordance) instead of reaching for
// raw MUI per call site. forwardRef keeps it drop-in compatible with MUI consumers.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { loading = false, disabled, startIcon, variant = 'contained', children, ...rest },
    ref
) {
    const spinner = <CircularProgress color="inherit" size={16} />;

    return (
        <MuiButton
            ref={ref}
            variant={variant}
            disabled={disabled || loading}
            startIcon={loading ? spinner : startIcon}
            {...rest}
        >
            {children}
        </MuiButton>
    );
});

export default Button;
