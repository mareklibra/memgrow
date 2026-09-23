'use client';

import { useActionState } from 'react';
import { AtSymbolIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import clsx from 'clsx';

import { requestPasswordReset, type PasswordResetRequestState } from '@/app/lib/actions';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { Button } from './button';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/app/ui/LanguageSwitcher';

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [state, formAction] = useActionState(
    requestPasswordReset,
    undefined as PasswordResetRequestState | undefined,
  );

  const isError =
    state &&
    (state.status === 'invalid' ||
      state.status === 'unavailable' ||
      state.status === 'rateLimited');

  return (
    <form className="space-y-3" action={formAction}>
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          {t('auth.forgotPasswordTitle')}
        </h1>
        <label className={s.label} htmlFor="email">
          {t('auth.email')}
        </label>
        <div className="relative">
          <input
            className={s.inputSimple}
            id="email"
            type="email"
            name="email"
            placeholder={t('auth.emailPlaceholder')}
            required
            autoComplete="email"
          />
          <AtSymbolIcon className={s.inputIcon} />
        </div>
        <Button className="mt-4 w-full" type="submit">
          {t('auth.sendResetLink')}
        </Button>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-blue-500 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
        {state && (
          <div className="mt-4 flex items-start space-x-1">
            {isError && (
              <ExclamationCircleIcon className={clsx('h-5 w-5 shrink-0', s.errorText)} />
            )}
            <p
              className={clsx(
                'text-sm',
                state.status === 'sent' ? 'text-green-700' : s.errorText,
              )}
            >
              {state.message}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
