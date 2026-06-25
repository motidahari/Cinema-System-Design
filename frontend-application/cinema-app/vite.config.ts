import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use '@/styles/_variables' as *; @use '@/styles/_mixins' as *;`,
            },
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api/v1': { target: 'http://localhost', changeOrigin: true },
            '/socket.io': { target: 'http://localhost', ws: true, changeOrigin: true },
        },
    },
});
