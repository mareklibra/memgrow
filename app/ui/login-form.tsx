'use client';

import { useActionState, useEffect } from 'react';
import {
  AtSymbolIcon,
  KeyIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';

import clsx from 'clsx';
import { authenticate } from '@/app/lib/actions';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { Button } from './button';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';

export default function LoginForm({ auth }: Readonly<{ auth: Session | null }>) {
  const router = useRouter();

  useEffect(() => {
    if (auth?.user) {
      router.push('/');
    }
  }, [auth, router]);

  const [errorMessage, formAction /* isPending */] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form className="space-y-3" action={formAction}>
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className={`${lusitana.className} mb-3 text-2xl`}>
          Please log in to continue.
        </h1>
        <div className="w-full">
          <div>
            <label className={s.label} htmlFor="email">
              Email
            </label>
            <div className="relative">
              <input
                className={s.inputSimple}
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                required
              />
              <AtSymbolIcon className={s.inputIcon} />
            </div>
          </div>
          <div className="mt-4">
            <label className={s.label} htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                className={s.inputSimple}
                id="password"
                type="password"
                name="password"
                placeholder="Enter password"
                required
              />
              <KeyIcon className={s.inputIcon} />
            </div>
          </div>
        </div>
        <Button className="mt-4 w-full">
          Log in <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-50" />
        </Button>
        <div className="flex h-8 items-end space-x-1">
          {errorMessage && (
            <>
              <ExclamationCircleIcon className={clsx('h-5 w-5', s.errorText)} />
              <p className={clsx('text-sm', s.errorText)}>{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
