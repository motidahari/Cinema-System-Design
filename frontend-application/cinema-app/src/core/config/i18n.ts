import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en';
import he from '@/locales/he';

// Initialised before the React tree mounts so every useTranslation() call finds a
// ready instance. English default; Hebrew available as 'he'.
i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        he: { translation: he },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        // React already escapes interpolated values.
        escapeValue: false,
    },
});

export default i18n;
