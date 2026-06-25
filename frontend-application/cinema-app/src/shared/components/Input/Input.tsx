// React
import { forwardRef } from 'react';

// MUI
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';

export type InputProps = TextFieldProps;

// Shared text input: a thin wrapper over MUI's TextField that pins the project
// defaults (full-width, outlined) so forms across the SPA stay visually consistent
// and never reach for raw <input>. Error/helperText pass straight through for
// field-level validation messages.
const Input = forwardRef<HTMLDivElement, InputProps>(function Input(
    { fullWidth = true, variant = 'outlined', ...rest },
    ref
) {
    return <TextField ref={ref} fullWidth={fullWidth} variant={variant} {...rest} />;
});

export default Input;
