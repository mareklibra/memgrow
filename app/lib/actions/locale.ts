'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { sql } from '@/app/lib/db';
import { auth } from '@/auth';
import {
  createTranslator,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from '@/app/lib/i18n';

export async function setLocale(
  locale: string,
): Promise<{ message?: string; locale?: Locale }> {
  const t = createTranslator(isLocale(locale) ? locale : 'en');
  if (!isLocale(locale)) {
    return { message: t('errors.invalidLocale') };
  }

  try {
    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      httpOnly: true,
    });
  } catch (error) {
    console.error('Failed to set locale cookie:', error);
    return { message: t('errors.generic') };
  }

  try {
    const session = await auth();
    if (session?.user?.id && !session.user.impersonating) {
      await sql`
        UPDATE users
        SET locale = ${locale}
        WHERE id = ${session.user.id}
      `;
    }
  } catch (error) {
    console.error('Failed to persist user locale:', error);
    return { message: t('errors.generic') };
  }

  revalidatePath('/', 'layout');
  return { locale };
}
