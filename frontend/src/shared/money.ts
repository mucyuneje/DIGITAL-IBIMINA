import type { Language } from './schema';

const FALLBACK_LOCALE: Record<Language, string> = { rw: 'en-GB', en: 'en-GB', fr: 'fr-FR' };

const INTL_LOCALE: Record<Language, string> = { rw: 'rw-RW', en: 'en-GB', fr: 'fr-FR' };

function safeLocale(locale: string): string {
  try {
    new Intl.NumberFormat(locale);
    return locale;
  } catch {
    return FALLBACK_LOCALE.en;
  }
}

/** Kinyarwanda is not in every ICU build — fall back gracefully, never throw. */
export function intlLocale(language: Language): string {
  return safeLocale(INTL_LOCALE[language]);
}

/** Whole Rwandan francs, grouped: 125 000 / 125,000 / 125 000 F RWF. */
export function formatAmount(amount: number, language: Language): string {
  const locale = intlLocale(language);
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      Math.round(amount),
    );
  } catch {
    return String(Math.round(amount));
  }
}

export function formatCurrency(amount: number, language: Language): string {
  return `${formatAmount(amount, language)} RWF`;
}

/** All timestamps display in the group's timezone, never the browser's. */
const TZ = 'Africa/Kigali';

const DATE_STYLE: Record<Language, Intl.DateTimeFormatOptions> = {
  rw: { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ },
  en: { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ },
  fr: { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ },
};

export function formatDate(ts: number, language: Language): string {
  const locale = intlLocale(language);
  try {
    return new Intl.DateTimeFormat(locale, DATE_STYLE[language]).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export function formatDateTime(ts: number, language: Language): string {
  const locale = intlLocale(language);
  try {
    return new Intl.DateTimeFormat(locale, {
      ...DATE_STYLE[language],
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TZ,
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function formatRelative(ts: number, language: Language): string {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(language), { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 1000],
    ['minute', 60_000],
    ['hour', 3_600_000],
    ['day', 86_400_000],
    ['month', 2_592_000_000],
    ['year', 31_536_000_000],
  ];
  try {
    let unit: Intl.RelativeTimeFormatUnit = 'second';
    let divisor = 1000;
    for (const [u, ms] of units) {
      if (abs >= ms) {
        unit = u;
        divisor = ms;
      }
    }
    return rtf.format(Math.round(diff / divisor), unit);
  } catch {
    return formatDate(ts, language);
  }
}
