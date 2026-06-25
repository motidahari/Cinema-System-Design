import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Swap the real browser router for an in-memory one rendering a marker, so the unit test
// asserts App mounts the router without depending on the full route tree or a live /me.
vi.mock('./core/router', () => ({
    router: createMemoryRouter([{ path: '/', element: <div data-testid="routed">routed</div> }]),
}));

const restoreSession = vi.fn();
vi.mock('./features/auth/stores/useAuthStore', () => ({
    useAuthStore: (selector: (state: { restoreSession: () => void }) => unknown) => selector({ restoreSession }),
}));

import App from './App';

describe('App', () => {
    beforeEach(() => {
        restoreSession.mockClear();
    });

    it('renders the router', () => {
        render(<App />);
        expect(screen.getByTestId('routed')).toBeInTheDocument();
    });

    it('restores the session once on mount', () => {
        render(<App />);
        expect(restoreSession).toHaveBeenCalledTimes(1);
    });
});
