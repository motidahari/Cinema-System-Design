import { test, expect } from '@playwright/test';

/**
 * OPTIONAL live smoke (TEST-STRATEGY §7.2). Drives a real register → reserve → confirm
 * flow against a running stack (`docker compose up`). It is NOT part of CI: the default
 * playwright.config.ts (testDir ./src) never discovers this *.e2e.spec.ts file, and each test self-skips
 * when the stack isn't reachable — so it can never turn CI red.
 *
 *   docker compose up --build
 *   E2E_BASE_URL=http://localhost npm --workspace cinema-app run test:e2e:live
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost';
const PASSWORD = 'E2EPassword1!';
const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}@cinema-e2e.test`;

// Skip the whole suite cleanly if there's no live stack to drive.
test.beforeEach(async ({ request }) => {
    try {
        const res = await request.get(BASE_URL, { timeout: 2000 });
        test.skip(!res.ok(), 'live stack not reachable — skipping smoke');
    } catch {
        test.skip(true, 'live stack not reachable — skipping smoke');
    }
});

async function registerAndLogin(page: import('@playwright/test').Page, email: string): Promise<void> {
    await page.goto(`${BASE_URL}/register`);
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(PASSWORD);
    await page.getByLabel(/^Confirm Password/).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/cinema$/); // auto-login redirects to the cinema
}

test.describe('Cinema reservation flow (live smoke)', () => {
    test('register → reserve two seats → confirm booking', async ({ page }) => {
        await registerAndLogin(page, uniqueEmail());

        // Seating map loads with available seats.
        await expect(page.locator('.seating-map')).toBeVisible();
        const available = page.locator('.seating-map__seat--available');
        await expect(available.first()).toBeVisible();

        // Select the first two (consecutive, non-isolating) available seats.
        await available.nth(0).click();
        await available.nth(1).click();
        await expect(page.locator('.seating-map__seat--selected')).toHaveCount(2);

        // Reserve → the panel shows the countdown timer and a confirm button.
        await page.getByRole('button', { name: 'Reserve Seats' }).click();
        await expect(page.locator('.reservation-panel__timer')).toBeVisible();

        // Confirm → success toast and the seats flip to BOOKED.
        await page.getByRole('button', { name: 'Confirm Booking' }).click();
        await expect(page.locator('.MuiSnackbar-root')).toContainText(/confirmed/i);
        await expect(page.locator('.seating-map__seat--booked')).toHaveCount(2);
    });

    test('unauthenticated visit to /cinema redirects to /login', async ({ page }) => {
        await page.goto(`${BASE_URL}/cinema`);
        await expect(page).toHaveURL(/\/login$/);
    });

    test('session survives reload (cookie persists, /auth/me re-derives auth)', async ({ page }) => {
        await registerAndLogin(page, uniqueEmail());
        await page.reload();
        await expect(page).toHaveURL(/\/cinema$/);
    });
});
