import { defineConfig, devices } from '@playwright/test';

// Isolated config for the OPTIONAL live smoke test. It is deliberately separate from
// playwright.config.ts (whose testDir is ./src, so it never discovers tests/e2e) — that
// keeps CI's `test:e2e` running only the mocked page tests. This config drives a real,
// already-running stack and is invoked explicitly via `npm run test:e2e:live`.
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/*.e2e.spec.ts',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
    },
    projects: [{ name: 'e2e', use: { ...devices['Desktop Chrome'] } }],
    // No webServer: the live smoke expects the full stack (docker compose up) to be running.
});
