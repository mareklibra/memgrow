import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { signOut, auth } from '@/auth';
import { Suspense } from 'react';
import { fetchAllUsers, isUserAdmin } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';

import SignoutButton from '../ui/SignoutButton';
import { ChangePasswordCard } from '../ui/ChangePasswordCard';
import { AddNewUserCard } from '../ui/AddNewUserCard';
import { LanguageCard } from '../ui/LanguageCard';
import { SettingsTabs } from '../ui/SettingsTabs';
import { UsersTable } from '../ui/UsersTable';

export default async function Page() {
  const myAuth = await auth();
  const { t } = await getI18n();
  const isLoggedIn = !!myAuth;
  const isAdmin = myAuth?.user?.id ? await isUserAdmin(myAuth.user.id) : false;

  const handleSignOut = async () => {
    'use server';
    await signOut();
  };

  const users = isAdmin ? await fetchAllUsers() : [];

  return (
    <div className="flex flex-col">
      <div className="flex flex-row">
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>
          {t('settings.title', { name: myAuth?.user?.name ?? '' })}
        </h1>
        <div className="grow"></div>
        <SignoutButton
          className="flex items-center justify-left rounded-md text-sm font-medium pr-8"
          isLoggedIn={isLoggedIn}
          handleSignOut={handleSignOut}
        />
      </div>

      <Suspense>
        <SettingsTabs
          general={<LanguageCard />}
          me={<ChangePasswordCard />}
          users={
            isAdmin ? (
              <div className="flex flex-col gap-6">
                <AddNewUserCard />
                <UsersTable users={users} currentUserId={myAuth?.user?.id ?? ''} />
              </div>
            ) : undefined
          }
        />
      </Suspense>

      <div className="flex flex-col gap-1 text-sm text-gray-500 mt-4">
        <span>
          {t('settings.buildCommit', {
            commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? t('settings.development'),
          })}
        </span>
        <span>
          {t('settings.buildTime', {
            time: process.env.NEXT_PUBLIC_BUILD_TIME ?? '—',
          })}
        </span>
      </div>
    </div>
  );
}
