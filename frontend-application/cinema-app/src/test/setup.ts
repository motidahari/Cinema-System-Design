import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en';

// Initialize i18n in English for all unit tests so useTranslation() resolves keys.
i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

// Unmount React trees and reset jsdom between tests so specs stay isolated.
afterEach(() => {
    cleanup();
});
