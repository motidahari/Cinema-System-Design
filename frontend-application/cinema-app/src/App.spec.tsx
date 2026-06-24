import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders without crashing', () => {
        const { container } = render(<App />);
        expect(container.firstChild).not.toBeNull();
    });

    it('renders the app root element', () => {
        const { container } = render(<App />);
        const appDiv = container.querySelector('#app');
        expect(appDiv).not.toBeNull();
    });
});
