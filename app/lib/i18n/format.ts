import { localeToBcp47, type Locale } from './locales';
import type { TFunction } from './translator';

export function formatRelativeTime(
  timestamp: number,
  locale: Locale,
  t: TFunction,
): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) {
    return t('time.justNow');
  }

  const rtf = new Intl.RelativeTimeFormat(localeToBcp47(locale), {
    numeric: 'always',
    style: 'narrow',
  });

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return rtf.format(-minutes, 'minute');
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return rtf.format(-hours, 'hour');
  }
  const days = Math.floor(hours / 24);
  return rtf.format(-days, 'day');
}

export function formatSimDate(date: Date, locale: Locale): string {
  const weekday = new Intl.DateTimeFormat(localeToBcp47(locale), {
    weekday: 'short',
  }).format(date);
  return `${weekday} ${date.getDate()}.${date.getMonth() + 1}.`;
}
