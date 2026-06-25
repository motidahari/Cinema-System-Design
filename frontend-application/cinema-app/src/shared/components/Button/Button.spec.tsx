import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
    it('renders its children as the label', () => {
        render(<Button>Reserve</Button>);

        expect(screen.getByRole('button', { name: 'Reserve' })).toBeInTheDocument();
    });

    it('forwards clicks to the onClick handler', async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Click me</Button>);

        await userEvent.click(screen.getByRole('button', { name: 'Click me' }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled and shows a spinner while loading', () => {
        render(<Button loading>Submit</Button>);

        const button = screen.getByRole('button', { name: 'Submit' });
        expect(button).toBeDisabled();
        expect(button.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    });

    it('does not fire onClick while loading', async () => {
        const onClick = vi.fn();
        render(
            <Button loading onClick={onClick}>
                Submit
            </Button>
        );

        // The loading button has `pointer-events: none`; skip the check so we can
        // still assert the click never reaches the handler.
        await userEvent.click(screen.getByRole('button', { name: 'Submit' }), { pointerEventsCheck: 0 });

        expect(onClick).not.toHaveBeenCalled();
    });

    it('respects an explicit disabled prop', () => {
        render(<Button disabled>Disabled</Button>);

        expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
    });

    it('forwards a ref to the underlying button element', () => {
        const ref = { current: null as HTMLButtonElement | null };
        render(<Button ref={ref}>Ref</Button>);

        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
});
