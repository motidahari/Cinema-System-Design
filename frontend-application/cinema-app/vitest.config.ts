import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.spec.{ts,tsx}'],
        exclude: ['src/**/*.page.spec.{ts,tsx}', 'node_modules', 'dist'],
        passWithNoTests: true,
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
});
