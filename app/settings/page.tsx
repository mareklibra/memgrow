import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { signOut, auth } from '@/auth';
import { fetchAllUsers } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';

import SignoutButton from '../ui/SignoutButton';
import { ChangePasswordCard } from '../ui/ChangePasswordCard';
import { AddNewUserCard } from '../ui/AddNewUserCard';
import { ImpersonateCard } from '../ui/ImpersonateCard';
import { LanguageCard } from '../ui/LanguageCard';

export default async function Page() {
  const myAuth = await auth();
  const { t } = await getI18n();
  const isLoggedIn = !!myAuth;
  const isAdmin = myAuth?.user?.is_admin ?? false;

  const handleSignOut = async () => {
    'use server';
    await signOut();
  };

  const otherUsers = isAdmin
    ? (await fetchAllUsers()).filter((u) => u.id !== myAuth?.user?.id)
    : [];

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

      <div className="flex flex-col space-y-4">
        <div className="flex">
          <LanguageCard />
        </div>

        <div className="flex">
          <ChangePasswordCard userId={myAuth?.user?.id} />
        </div>

        <div className="flex">
          <AddNewUserCard />
        </div>

        {isAdmin && (
          <div className="flex">
            <ImpersonateCard users={otherUsers} />
          </div>
        )}

        <div className="flex flex-col gap-1 text-sm text-gray-500">
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
    </div>
  );
}
