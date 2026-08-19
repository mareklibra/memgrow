import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

export type ResolveLocaleInput = {
  cookie?: string | null;
  acceptLanguage?: string | null;
  dbLocale?: string | null;
  impersonating?: boolean;
  loggedIn?: boolean;
};

export type ResolvedLocale = {
  locale: Locale;
  shouldPersistToCookie: boolean;
  shouldPersistToDb: boolean;
};

/**
 * Pick the first supported locale from an Accept-Language header.
 * `cs` and `cs-*` map to Czech; anything else supported maps to itself;
 * unknown tags are skipped.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) {
    return null;
  }

  const parts = header.split(',').map((part) => {
    const [tag, ...params] = part.trim().split(';');
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split('=');
      if (key === 'q' && value) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          q = parsed;
        }
      }
    }
    return { tag: tag.trim().toLowerCase(), q };
  });

  parts.sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    if (!tag) continue;
    const primary = tag.split('-')[0];
    if (isLocale(primary)) {
      return primary;
    }
  }

  return null;
}

/**
 * Cookie is the current browser UI language. DB/JWT is the account default,
 * used only when the cookie is missing (e.g. after password login on a new
 * device). Never overwrite an existing cookie from DB — that would fight the
 * language switcher because the JWT locale is only set at login.
 */
export function resolveLocale(input: ResolveLocaleInput): ResolvedLocale {
  const cookie = isLocale(input.cookie) ? input.cookie : null;
  const fromHeader = parseAcceptLanguage(input.acceptLanguage);
  const fallback: Locale = cookie ?? fromHeader ?? DEFAULT_LOCALE;

  if (!input.loggedIn || input.impersonating) {
    return {
      locale: fallback,
      shouldPersistToCookie: false,
      shouldPersistToDb: false,
    };
  }

  const db = isLocale(input.dbLocale) ? input.dbLocale : null;

  if (cookie) {
    return {
      locale: cookie,
      shouldPersistToCookie: false,
      shouldPersistToDb: db !== cookie,
    };
  }

  if (db) {
    return {
      locale: db,
      shouldPersistToCookie: true,
      shouldPersistToDb: false,
    };
  }

  return {
    locale: fallback,
    shouldPersistToCookie: true,
    shouldPersistToDb: true,
  };
}
