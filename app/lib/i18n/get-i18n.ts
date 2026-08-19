import { auth } from '@/auth';
import { fetchUserLocale } from '@/app/lib/data';
import { cookies, headers } from 'next/headers';

import { catalogs } from './translator';
import { createTranslator, type TFunction } from './translator';
import { isLocale, LOCALE_COOKIE, type Locale } from './locales';
import { resolveLocale, type ResolvedLocale } from './resolve-locale';
import type { Messages } from './ref';

export type I18n = {
  t: TFunction;
  locale: Locale;
  messages: Messages;
  resolved: ResolvedLocale;
  persistLocale: Locale | null;
};

async function readCookieLocale(): Promise<string | undefined> {
  try {
    const store = await cookies();
    return store.get(LOCALE_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

async function readAcceptLanguage(): Promise<string | null> {
  try {
    const headerStore = await headers();
    return headerStore.get('accept-language');
  } catch {
    return null;
  }
}

export async function getI18n(): Promise<I18n> {
  const cookie = await readCookieLocale();
  const acceptLanguage = await readAcceptLanguage();

  let loggedIn = false;
  let impersonating = false;
  let dbLocale: string | null = null;
  try {
    const session = await auth();
    loggedIn = !!session?.user?.id;
    impersonating = session?.user?.impersonating ?? false;
    if (loggedIn && session?.user?.id && !impersonating) {
      dbLocale = await fetchUserLocale(session.user.id);
      if (dbLocale !== null && !isLocale(dbLocale)) {
        dbLocale = null;
      }
    }
  } catch {
    // Tests and non-request contexts may not have a session.
  }

  const resolved = resolveLocale({
    cookie,
    acceptLanguage,
    dbLocale,
    impersonating,
    loggedIn,
  });

  const persistLocale =
    resolved.shouldPersistToCookie || resolved.shouldPersistToDb ? resolved.locale : null;

  return {
    t: createTranslator(resolved.locale),
    locale: resolved.locale,
    messages: catalogs[resolved.locale],
    resolved,
    persistLocale,
  };
}
