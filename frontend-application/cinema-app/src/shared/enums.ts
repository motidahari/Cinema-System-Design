// Shared UI enums.

// Toast severities. Values match MUI's AlertColor strings, so a single cast at the
// MUI <Alert> boundary (Toast.tsx) is all that's needed to bridge to the library.
export enum ToastSeverity {
    Success = 'success',
    Error = 'error',
    Warning = 'warning',
    Info = 'info',
}
