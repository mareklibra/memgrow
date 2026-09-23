'use client';

import { useActionState, useEffect } from 'react';
import { KeyIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

import { resetPasswordWithToken, type ResetPasswordState } from '@/app/lib/actions';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { Button } from './button';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/app/ui/LanguageSwitcher';

export default function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const { t } = useTranslation();
  const router = useRouter();
  const [state, formAction] = useActionState(
    resetPasswordWithToken,
    undefined as ResetPasswordState | undefined,
  );

  useEffect(() => {
    if (state?.status === 'ok') {
      router.push('/login');
    }
  }, [state, router]);

  return (
    <form className="space-y-3" action={formAction}>
      <input type="hidden" name="token" value={token} />
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          {t('auth.resetPasswordTitle')}
        </h1>
        <label className={s.label} htmlFor="password">
          {t('settings.newPassword')}
        </label>
        <div className="relative">
          <input
            className={s.inputSimple}
            id="password"
            type="password"
            name="password"
            placeholder={t('auth.passwordPlaceholder')}
            required
            autoComplete="new-password"
          />
          <KeyIcon className={s.inputIcon} />
        </div>
        <label className={`${s.label} mt-4`} htmlFor="confirm">
          {t('auth.confirmPassword')}
        </label>
        <div className="relative">
          <input
            className={s.inputSimple}
            id="confirm"
            type="password"
            name="confirm"
            placeholder={t('settings.retype')}
            required
            autoComplete="new-password"
          />
          <KeyIcon className={s.inputIcon} />
        </div>
        <Button className="mt-4 w-full" type="submit">
          {t('auth.setNewPassword')}
        </Button>
        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="text-blue-500 hover:underline">
            {t('auth.forgotPassword')}
          </Link>
          {' · '}
          <Link href="/login" className="text-blue-500 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
        {state && state.status !== 'ok' && (
          <div className="mt-4 flex items-start space-x-1">
            <ExclamationCircleIcon className={clsx('h-5 w-5 shrink-0', s.errorText)} />
            <p className={clsx('text-sm', s.errorText)}>{state.message}</p>
          </div>
        )}
      </div>
    </form>
  );
}
