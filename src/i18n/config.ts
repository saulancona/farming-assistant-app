import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import swTranslations from './locales/sw.json';
import haTranslations from './locales/ha.json';
import amTranslations from './locales/am.json';
import frTranslations from './locales/fr.json';

// Language resources
const resources = {
  en: { translation: enTranslations },
  sw: { translation: swTranslations },
  ha: { translation: haTranslations },
  am: { translation: amTranslations },
  fr: { translation: frTranslations }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false // React already escapes values
    },

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      // Cache user language
      caches: ['localStorage'],
      lookupLocalStorage: 'agroafrica_language'
    }
  });

export default i18n;
