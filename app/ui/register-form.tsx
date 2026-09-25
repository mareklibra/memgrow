'use client';

import { useActionState, useState } from 'react';
import {
  AtSymbolIcon,
  ExclamationCircleIcon,
  KeyIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import clsx from 'clsx';

import { registerUser } from '@/app/lib/actions';
import { localeDisplayNames, LOCALES } from '@/app/lib/i18n';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { Button } from './button';

export default function RegisterForm() {
  const { t, locale } = useTranslation();
  const [errorMessage, formAction] = useActionState(registerUser, undefined);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selectedLocale, setSelectedLocale] = useState<string>(locale);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (password !== confirm) {
      event.preventDefault();
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setSubmittedEmail(email.trim().toLowerCase());
  }

  const emailTaken =
    errorMessage === t('auth.emailAlreadyRegistered') &&
    submittedEmail !== null &&
    email.trim().toLowerCase() === submittedEmail;

  const message = passwordMismatch
    ? t('errors.passwordMismatch')
    : emailTaken
      ? errorMessage
      : errorMessage === t('auth.emailAlreadyRegistered')
        ? undefined
        : errorMessage;

  return (
    <form
      className="space-y-3"
      action={formAction}
      onSubmit={handleSubmit}
    >
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          {t('auth.registerTitle')}
        </h1>
        <div className="w-full">
          <div>
            <label className={s.label} htmlFor="name">
              {t('settings.name')}
            </label>
            <div className="relative">
              <input
                className={s.inputSimple}
                id="name"
                type="text"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
              />
              <UserIcon className={s.inputIcon} />
            </div>
          </div>
          <div className="mt-4">
            <label className={s.label} htmlFor="email">
              {t('auth.email')}
            </label>
            <div className="relative">
              <input
                className={clsx(s.inputSimple, emailTaken && 'border-red-500')}
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                autoComplete="email"
                aria-invalid={emailTaken}
              />
              <AtSymbolIcon className={s.inputIcon} />
            </div>
          </div>
          <div className="mt-4">
            <label className={s.label} htmlFor="password">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                className={clsx(s.inputSimple, passwordMismatch && 'border-red-500')}
                id="password"
                type="password"
                name="password"
                value={password}
                onChange={(event) => {
                  const next = event.target.value;
                  setPassword(next);
                  if (passwordMismatch && next === confirm) setPasswordMismatch(false);
                }}
                placeholder={t('auth.passwordPlaceholder')}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                aria-invalid={passwordMismatch}
              />
              <KeyIcon className={s.inputIcon} />
            </div>
          </div>
          <div className="mt-4">
            <label className={s.label} htmlFor="confirm">
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <input
                className={clsx(s.inputSimple, passwordMismatch && 'border-red-500')}
                id="confirm"
                type="password"
                name="confirm"
                value={confirm}
                onChange={(event) => {
                  const next = event.target.value;
                  setConfirm(next);
                  if (passwordMismatch && password === next) setPasswordMismatch(false);
                }}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                aria-invalid={passwordMismatch}
              />
              <KeyIcon className={s.inputIcon} />
            </div>
          </div>
          <div className="mt-4">
            <label className={s.label} htmlFor="locale">
              {t('settings.language')}
            </label>
            <select
              className="block w-full rounded-md border border-gray-200 py-2 text-sm"
              id="locale"
              name="locale"
              value={selectedLocale}
              onChange={(event) => setSelectedLocale(event.target.value)}
              required
            >
              {LOCALES.map((code) => (
                <option key={code} value={code}>
                  {localeDisplayNames[code]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button className="mt-4 w-full" type="submit">
          {t('auth.registerSubmit')}{' '}
          <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </Button>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-blue-500 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
        <div className="flex h-8 items-end space-x-1">
          {message && (
            <>
              <ExclamationCircleIcon className={clsx('h-5 w-5', s.errorText)} />
              <p className={clsx('text-sm', s.errorText)}>{message}</p>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
