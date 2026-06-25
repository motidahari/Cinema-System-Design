import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const USER = { id: 'u-2', email: 'bob@example.com', createdAt: '2026-01-01T00:00:00.000Z' };

// Guest stub (see LoginView.page.spec). /register is reached by following the prompt link
// from /login so the client-side navigation mirrors a real guest's path through the app.
async function stubGuest(page: Page): Promise<void> {
    await page.route('**/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
    await page.route('**/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
}

async function gotoRegister(page: Page): Promise<void> {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/register$/);
}

test.describe('RegisterView (page)', () => {
    test('renders the register form', async ({ page }) => {
        await stubGuest(page);
        await gotoRegister(page);

        await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
        await expect(page.getByLabel(/^Confirm Password/)).toBeVisible();
    });

    test('registers and lands on the cinema route', async ({ page }) => {
        await stubGuest(page);
        await page.route('**/auth/register', (route) => route.fulfill({ status: 200, json: { user: USER } }));
        await gotoRegister(page);

        await page.getByLabel(/^Email/).fill(USER.email);
        await page.getByLabel(/^Password/).fill('secret123');
        await page.getByLabel(/^Confirm Password/).fill('secret123');
        await page.getByRole('button', { name: 'Create Account' }).click();

        await expect(page).toHaveURL(/\/cinema$/);
    });

    test('navigates back to the login view via the prompt link', async ({ page }) => {
        await stubGuest(page);
        await gotoRegister(page);

        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });
});
