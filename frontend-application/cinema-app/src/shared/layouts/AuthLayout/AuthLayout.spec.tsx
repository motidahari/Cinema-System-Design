import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthLayout from './AuthLayout';

function renderLayout() {
    return render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<AuthLayout />}>
                    <Route index element={<div>Auth Child View</div>} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

describe('AuthLayout', () => {
    it('renders the routed child view through its outlet', () => {
        renderLayout();

        expect(screen.getByText('Auth Child View')).toBeInTheDocument();
    });
});
