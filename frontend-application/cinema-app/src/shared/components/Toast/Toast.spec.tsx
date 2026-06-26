import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from './Toast';
import { ToastSeverity } from '@/shared/enums';

describe('Toast', () => {
    it('renders the message when open', () => {
        render(<Toast open message="Seats reserved!" severity={ToastSeverity.Success} onClose={() => {}} />);

        expect(screen.getByText('Seats reserved!')).toBeInTheDocument();
    });

    it('does not render the message when closed', () => {
        render(<Toast open={false} message="Hidden" severity={ToastSeverity.Info} onClose={() => {}} />);

        expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('maps the severity to the matching alert role styling', () => {
        render(<Toast open message="Something failed" severity={ToastSeverity.Error} onClose={() => {}} />);

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Something failed');
        expect(alert.className).toContain('MuiAlert-filledError');
    });

    it('calls onClose when the close button is clicked', async () => {
        const onClose = vi.fn();
        render(<Toast open message="Closable" severity={ToastSeverity.Info} onClose={onClose} />);

        await userEvent.click(screen.getByRole('button', { name: /close/i }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
