import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const USER = { id: 'u-1', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00.000Z' };

const SEATS = [
    { id: 'seat-A1', row: 'A', number: 1, status: 'AVAILABLE' },
    { id: 'seat-A2', row: 'A', number: 2, status: 'AVAILABLE' },
    { id: 'seat-A3', row: 'A', number: 3, status: 'BOOKED' },
    { id: 'seat-B1', row: 'B', number: 1, status: 'AVAILABLE' },
    { id: 'seat-B2', row: 'B', number: 2, status: 'RESERVED' },
];

const RESERVATION = {
    id: 'res-1',
    status: 'PENDING',
    expiresAt: '2026-06-25T10:15:00.000Z',
    expiresInSeconds: 900,
    seatIds: ['seat-A1', 'seat-A2'],
};

// Stub the identity-service probes and cinema-service endpoints so the SPA runs
// against mocked HTTP responses — no live backend required.
async function stubAuth(page: Page): Promise<void> {
    await page.route('**/auth/me', (route) => route.fulfill({ status: 200, json: { user: USER } }));
    await page.route('**/auth/refresh', (route) => route.fulfill({ status: 200, json: { user: USER } }));
    await page.route('**/auth/logout', (route) => route.fulfill({ status: 204 }));
}

async function stubSeats(page: Page): Promise<void> {
    await page.route('**/seats', (route) => route.fulfill({ status: 200, json: { seats: SEATS } }));
}

async function stubReserve(page: Page): Promise<void> {
    await page.route('**/reservations', (route) => {
        if (route.request().method() === 'POST') {
            return route.fulfill({ status: 201, json: RESERVATION });
        }
        return route.fallback();
    });
}

async function stubMyReservations(page: Page, reservations = []): Promise<void> {
    await page.route('**/reservations', (route) => {
        if (route.request().method() === 'GET') {
            return route.fulfill({ status: 200, json: { reservations } });
        }
        return route.fallback();
    });
}

async function stubConfirm(page: Page, reservationId = RESERVATION.id): Promise<void> {
    await page.route(`**/reservations/${reservationId}/confirm`, (route) =>
        route.fulfill({
            status: 200,
            json: { ...RESERVATION, status: 'CONFIRMED', expiresInSeconds: 0 },
        })
    );
}

async function stubCancel(page: Page, reservationId = RESERVATION.id): Promise<void> {
    await page.route(`**/reservations/${reservationId}`, (route) => {
        if (route.request().method() === 'DELETE') {
            return route.fulfill({ status: 204 });
        }
        return route.fallback();
    });
}

// Block Socket.io so page tests don't attempt a live WS connection.
async function stubSocket(page: Page): Promise<void> {
    await page.route('**/socket.io/**', (route) => route.abort());
}

async function gotoCinema(page: Page): Promise<void> {
    await stubMyReservations(page);
    await page.goto('/cinema');
    await expect(page).toHaveURL(/\/cinema$/);
}

test.describe('CinemaView (page)', () => {
    test('renders the seating map and reservation panel for an authenticated user', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubSocket(page);
        await gotoCinema(page);

        await expect(page.getByTestId('cinema-view')).toBeVisible();
        // SeatingMap is rendered — the screen label appears
        await expect(page.getByText('SCREEN')).toBeVisible();
        // ReservationPanel is rendered — the selection prompt appears
        await expect(page.getByText('Click seats to select them')).toBeVisible();
    });

    test('redirects to /login when the user is not authenticated', async ({ page }) => {
        await page.route('**/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
        await page.route('**/auth/refresh', (route) => route.fulfill({ status: 401, json: {} }));
        await page.goto('/cinema');

        await expect(page).toHaveURL(/\/login$/);
    });

    test('selects seats and shows the reserve button', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubSocket(page);
        await gotoCinema(page);

        // Click an available seat
        await page.getByRole('button', { name: /Row A Seat 1/ }).click();

        await expect(page.getByText('1 seat(s) selected')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reserve Seats' })).toBeVisible();
    });

    test('reserves selected seats and shows the countdown panel', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubReserve(page);
        await stubSocket(page);
        await gotoCinema(page);

        await page.getByRole('button', { name: /Row A Seat 1/ }).click();
        await page.getByRole('button', { name: /Row A Seat 2/ }).click();
        await page.getByRole('button', { name: 'Reserve Seats' }).click();

        await expect(page.getByText('Expires in:')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel Reservation' })).toBeVisible();
    });

    test('confirms a reservation and shows the confirmed state', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubReserve(page);
        await stubConfirm(page);
        await stubSocket(page);
        await gotoCinema(page);

        await page.getByRole('button', { name: /Row A Seat 1/ }).click();
        await page.getByRole('button', { name: /Row A Seat 2/ }).click();
        await page.getByRole('button', { name: 'Reserve Seats' }).click();
        await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeVisible();
        await page.getByRole('button', { name: 'Confirm Booking' }).click();

        await expect(page.getByText('Booking confirmed!')).toBeVisible();
    });

    test('cancels a reservation and returns to the selection state', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubReserve(page);
        await stubCancel(page);
        await stubSocket(page);
        await gotoCinema(page);

        await page.getByRole('button', { name: /Row A Seat 1/ }).click();
        await page.getByRole('button', { name: /Row A Seat 2/ }).click();
        await page.getByRole('button', { name: 'Reserve Seats' }).click();
        await expect(page.getByRole('button', { name: 'Cancel Reservation' })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel Reservation' }).click();

        await expect(page.getByText('Click seats to select them')).toBeVisible();
    });

    test('shows seat-count chips on the seating map header', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubSocket(page);
        await gotoCinema(page);

        // 3 AVAILABLE seats, 1 RESERVED, 1 BOOKED from SEATS fixture
        await expect(page.getByLabel('3 available seats')).toBeVisible();
        await expect(page.getByLabel('1 reserved seats')).toBeVisible();
        await expect(page.getByLabel('1 booked seats')).toBeVisible();
    });

    test('restores a pending reservation after refresh and shows the lifecycle actions', async ({ page }) => {
        await stubAuth(page);
        await stubSeats(page);
        await stubSocket(page);
        await stubMyReservations(page, [RESERVATION]);

        await page.goto('/cinema');

        await expect(page.getByText('Active reservation restored. You can confirm or cancel it.')).toBeVisible();
        await expect(page.getByText('Expires in:')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel Reservation' })).toBeVisible();
    });
});
