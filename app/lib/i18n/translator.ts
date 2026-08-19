import { IntlMessageFormat } from 'intl-messageformat';

import { enMessages, type Messages } from './ref';
import { csMessages } from './cs';
import { getMessageByPath } from './flatten';
import { DEFAULT_LOCALE, isLocale, localeToBcp47, type Locale } from './locales';

export const catalogs: Record<Locale, Messages> = {
  en: enMessages,
  cs: csMessages,
};

type NestedMessageKeys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : NestedMessageKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = NestedMessageKeys<typeof enMessages>;

export type InterpolationValues = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export type TFunction = (key: MessageKey, values?: InterpolationValues) => string;

export function createTranslator(locale: string): TFunction {
  const resolved: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const catalog = catalogs[resolved];
  const fallback = catalogs[DEFAULT_LOCALE];
  const bcp47 = localeToBcp47(resolved);

  return (key, values) => {
    const message = getMessageByPath(catalog, key) ?? getMessageByPath(fallback, key);
    if (message == null) {
      return key;
    }
    if (!values && !message.includes('{')) {
      return message;
    }
    try {
      return String(new IntlMessageFormat(message, bcp47).format(values ?? {}));
    } catch {
      return message;
    }
  };
}
