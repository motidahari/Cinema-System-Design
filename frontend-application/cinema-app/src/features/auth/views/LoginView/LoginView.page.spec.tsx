import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const USER = { id: 'u-1', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00.000Z' };

// Stub the identity-service so the SPA runs without a live backend: the initial session
// probe (GET /auth/me) and its refresh both 401, leaving the app in a stable guest state
// on /login (the BaseHttpService guard suppresses the redirect loop while on /login).
async function stubGuest(page: Page): Promise<void> {
    await page.route('**/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
    await page.route('**/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
}

test.describe('LoginView (page)', () => {
    test('renders the login form for a guest', async ({ page }) => {
        await stubGuest(page);
        await page.goto('/login');

        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
        await expect(page.getByLabel(/^Email/)).toBeVisible();
        await expect(page.getByLabel(/^Password/)).toBeVisible();
    });

    test('logs in and lands on the cinema route', async ({ page }) => {
        await stubGuest(page);
        await page.route('**/auth/login', (route) => route.fulfill({ status: 200, json: { user: USER } }));
        await page.goto('/login');

        await page.getByLabel(/^Email/).fill(USER.email);
        await page.getByLabel(/^Password/).fill('secret123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page).toHaveURL(/\/cinema$/);
    });

    test('navigates to the register view via the prompt link', async ({ page }) => {
        await stubGuest(page);
        await page.goto('/login');

        await page.getByRole('button', { name: 'Create Account' }).click();

        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByLabel(/^Confirm Password/)).toBeVisible();
    });
});
