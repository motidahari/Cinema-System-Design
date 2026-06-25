// The error payload every backend service returns on failure (API-CONTRACT.md §5).
export interface ApiError {
    errorCode: number;
    errorMessage: string;
}

// Axios surfaces HTTP errors as objects carrying the server payload under
// `response.data`. This is the shape the SPA reads error messages from.
export interface ApiErrorResponse {
    response?: {
        status?: number;
        data?: Partial<ApiError>;
    };
}

// Type guard: narrows an `unknown` caught error to one that may carry an
// `ApiError` payload, so callers can safely read `err.response?.data?.errorMessage`.
export function isApiError(err: unknown): err is ApiErrorResponse {
    return typeof err === 'object' && err !== null && 'response' in err;
}
