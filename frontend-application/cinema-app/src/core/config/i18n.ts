import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en';
import he from '@/locales/he';

// Initialise i18next with English as the default language (Hebrew available as 'he').
// Called once at app start (main.tsx) before the React tree mounts so every component
// that calls useTranslation() finds an initialised instance.
i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        he: { translation: he },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        // React already escapes values so XSS protection is not needed here.
        escapeValue: false,
    },
});

export default i18n;
