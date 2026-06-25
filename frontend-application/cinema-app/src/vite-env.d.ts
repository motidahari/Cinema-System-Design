/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_IDENTITY_API_URL?: string;
    readonly VITE_CINEMA_API_URL?: string;
    readonly VITE_SOCKET_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
