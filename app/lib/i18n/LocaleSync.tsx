'use client';

import { useEffect, useRef } from 'react';

import { setLocale } from '@/app/lib/actions/locale';
import { isLocale, type Locale } from './locales';

/**
 * After password login, persist the resolved locale to cookie and/or DB.
 * No-op while impersonating (caller passes null).
 */
export function LocaleSync({
  persistLocale,
}: Readonly<{ persistLocale: Locale | null }>) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || persistLocale == null || !isLocale(persistLocale)) {
      return;
    }
    ran.current = true;
    void setLocale(persistLocale);
  }, [persistLocale]);

  return null;
}
