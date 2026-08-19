'use client';

import { createContext, useMemo, type ReactNode } from 'react';

import {
  catalogs,
  createTranslator,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  type Messages,
  type TFunction,
} from './index';

export type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: TFunction;
};

export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  messages: catalogs[DEFAULT_LOCALE],
  t: createTranslator(DEFAULT_LOCALE),
});

export function I18nProvider({
  locale,
  messages,
  children,
}: Readonly<{
  locale: string;
  messages: Messages;
  children: ReactNode;
}>) {
  const value = useMemo<I18nContextValue>(() => {
    const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE;
    return {
      locale: resolved,
      messages,
      t: createTranslator(resolved),
    };
  }, [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
