import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from './Input';

describe('Input', () => {
    it('renders with its label', () => {
        render(<Input label="Email" />);

        expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('shows the current value', () => {
        render(<Input label="Email" value="alice@example.com" onChange={() => {}} />);

        expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com');
    });

    it('calls onChange as the user types', async () => {
        const onChange = vi.fn();
        render(<Input label="Email" onChange={onChange} />);

        await userEvent.type(screen.getByLabelText('Email'), 'a');

        expect(onChange).toHaveBeenCalled();
    });

    it('renders helper text in the error state', () => {
        render(<Input label="Password" error helperText="Password is required" />);

        expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('disables the field when disabled', () => {
        render(<Input label="Email" disabled />);

        expect(screen.getByLabelText('Email')).toBeDisabled();
    });
});
