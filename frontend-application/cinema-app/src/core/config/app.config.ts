export const appConfig = {
    identityApiUrl: (import.meta.env.VITE_IDENTITY_API_URL as string) ?? 'http://localhost:3001/api/v1',
    cinemaApiUrl: (import.meta.env.VITE_CINEMA_API_URL as string) ?? 'http://localhost:3002/api/v1',
    socketUrl: (import.meta.env.VITE_SOCKET_URL as string) ?? 'http://localhost:3002',
} as const;
