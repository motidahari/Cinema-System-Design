import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSwitcher from './LanguageSwitcher';

const changeLanguage = vi.fn();
let currentLang = 'en';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: {
            get language() {
                return currentLang;
            },
            changeLanguage: changeLanguage,
        },
    }),
}));

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentLang = 'en';
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';
    });

    it('shows the current language code on the button', () => {
        render(<LanguageSwitcher />);
        expect(screen.getByRole('button', { name: /switch to/i })).toHaveTextContent('EN');
    });

    it('calls changeLanguage with "he" when toggled from English', async () => {
        render(<LanguageSwitcher />);
        await userEvent.click(screen.getByRole('button'));
        expect(changeLanguage).toHaveBeenCalledWith('he');
    });

    it('calls changeLanguage with "en" when toggled from Hebrew', async () => {
        currentLang = 'he';
        render(<LanguageSwitcher />);
        await userEvent.click(screen.getByRole('button'));
        expect(changeLanguage).toHaveBeenCalledWith('en');
    });

    it('sets document dir to rtl when switching to Hebrew', async () => {
        render(<LanguageSwitcher />);
        await userEvent.click(screen.getByRole('button'));
        expect(document.documentElement.dir).toBe('rtl');
    });
});
