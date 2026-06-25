import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeatGrid from './SeatGrid';
import { Seat } from '../../models/Seat';
import { makeSeat } from '@/test/factories';

const onSeatSelect = vi.fn();
const onSeatDeselect = vi.fn();

// Seats provided out of order to assert the grid sorts by seat number.
const seats = [
    new Seat(makeSeat({ id: 'seat-B2', row: 'B', number: 2, status: 'AVAILABLE' })),
    new Seat(makeSeat({ id: 'seat-B1', row: 'B', number: 1, status: 'AVAILABLE' })),
    new Seat(makeSeat({ id: 'seat-B3', row: 'B', number: 3, status: 'BOOKED' })),
];

function renderGrid(selected: string[] = []) {
    render(
        <SeatGrid
            row="B"
            seats={seats}
            selectedSeatIds={new Set(selected)}
            onSeatSelect={onSeatSelect}
            onSeatDeselect={onSeatDeselect}
        />
    );
}

describe('SeatGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the row label and one button per seat', () => {
        renderGrid();
        const row = screen.getByRole('row', { name: 'Row B' });

        expect(within(row).getByText('B')).toBeInTheDocument();
        expect(within(row).getAllByRole('button')).toHaveLength(3);
    });

    it('orders the seats by seat number', () => {
        renderGrid();

        const labels = screen.getAllByRole('button').map((b) => b.textContent);
        expect(labels).toEqual(['1', '2', '3']);
    });

    it('marks the selected seat as pressed', () => {
        renderGrid(['seat-B2']);

        expect(screen.getByRole('button', { name: /Seat 2/ })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /Seat 1/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('forwards a seat selection up to the handler', async () => {
        renderGrid();

        await userEvent.click(screen.getByRole('button', { name: /Seat 1/ }));

        expect(onSeatSelect).toHaveBeenCalledWith('seat-B1');
    });
});
