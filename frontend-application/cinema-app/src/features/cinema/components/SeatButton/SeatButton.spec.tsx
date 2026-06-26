import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeatButton from './SeatButton';
import { Seat } from '../../models/Seat';
import { makeSeat, type SeatStatus } from '@/test/factories';

const onSelect = vi.fn();
const onDeselect = vi.fn();

function renderSeat(status: SeatStatus, isSelected = false, locked = false) {
    const seat = new Seat(makeSeat({ id: 'seat-A3', row: 'A', number: 3, status }));
    render(
        <SeatButton seat={seat} isSelected={isSelected} locked={locked} onSelect={onSelect} onDeselect={onDeselect} />
    );
    return seat;
}

describe('SeatButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the seat number as its label', () => {
        renderSeat('AVAILABLE');

        expect(screen.getByRole('button', { name: /Row A Seat 3/ })).toHaveTextContent('3');
    });

    it('applies the status modifier class for an available seat', () => {
        renderSeat('AVAILABLE');

        expect(screen.getByRole('button')).toHaveClass('seating-map__seat--available');
    });

    it('selects an available seat on click', async () => {
        renderSeat('AVAILABLE');

        await userEvent.click(screen.getByRole('button'));

        expect(onSelect).toHaveBeenCalledWith('seat-A3');
        expect(onDeselect).not.toHaveBeenCalled();
    });

    it('deselects an already-selected seat on click and marks it pressed', async () => {
        renderSeat('AVAILABLE', true);
        const button = screen.getByRole('button');

        expect(button).toHaveClass('seating-map__seat--selected');
        expect(button).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(button);

        expect(onDeselect).toHaveBeenCalledWith('seat-A3');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('disables a reserved seat and ignores clicks', async () => {
        renderSeat('RESERVED');
        const button = screen.getByRole('button');

        expect(button).toBeDisabled();
        expect(button).toHaveClass('seating-map__seat--reserved');

        await userEvent.click(button, { pointerEventsCheck: 0 });

        expect(onSelect).not.toHaveBeenCalled();
        expect(onDeselect).not.toHaveBeenCalled();
    });

    it('disables a booked seat', () => {
        renderSeat('BOOKED');

        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables an available seat and ignores clicks while locked', async () => {
        renderSeat('AVAILABLE', false, true);
        const button = screen.getByRole('button');

        expect(button).toBeDisabled();

        await userEvent.click(button, { pointerEventsCheck: 0 });

        expect(onSelect).not.toHaveBeenCalled();
        expect(onDeselect).not.toHaveBeenCalled();
    });
});
