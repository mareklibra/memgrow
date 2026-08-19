export const LOCALES = ['en', 'cs'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function localeToBcp47(locale: Locale): string {
  return locale === 'cs' ? 'cs-CZ' : 'en-US';
}

export const localeDisplayNames: Record<Locale, string> = {
  en: 'English',
  cs: 'Čeština',
};
