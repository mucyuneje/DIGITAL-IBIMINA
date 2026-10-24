import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import rw from './locales/rw.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import type { Language } from '@shared/schema';

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'rw', label: 'Kinyarwanda', native: 'Ikinyarwanda' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'French', native: 'Français' },
];

export const LANGUAGE_STORAGE_KEY = 'ibimina.language';

/**
 * Language is a per-device preference — never tied to the member's account.
 * Detected from localStorage, then navigator, then falls back to Kinyarwanda.
 *
 * SSR-safe: the detector is only attached in the browser; on the server
 * i18next resolves to the fallback language so no localStorage access happens
 * during prerender.
 */
const instance = i18n.use(initReactI18next);

if (typeof window !== 'undefined') {
  instance.use(LanguageDetector);
  // The initial <html lang> sync happens after mount in Providers. Doing it
  // here would run before hydration and mismatch the server's `lang="rw"`.
}

void instance.init({
  resources: {
    rw: { translation: rw },
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: typeof window === 'undefined' ? 'rw' : undefined,
  fallbackLng: 'rw',
  supportedLngs: ['rw', 'en', 'fr'],
  interpolation: { escapeValue: false },
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    caches: ['localStorage'],
  },
});

export function setLanguage(code: Language) {
  void i18n.changeLanguage(code);
  if (typeof document !== 'undefined') document.documentElement.lang = code;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    /* private mode — the in-memory language still switches */
  }
}

export function currentLanguage(): Language {
  const code = i18n.resolvedLanguage?.slice(0, 2);
  return code === 'en' || code === 'fr' ? code : 'rw';
}

export default i18n;
