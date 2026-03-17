import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { signOut, auth } from '@/auth';

import SignoutButton from '../ui/SignoutButton';
import { ChangePasswordCard } from '../ui/ChangePasswordCard';
import { AddNewUserCard } from '../ui/AddNewUserCard';

export default async function Page() {
  const myAuth = await auth();
  const isLoggedIn = !!myAuth;

  const handleSignOut = async () => {
    'use server';
    await signOut();
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-row">
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>
          Settings for {myAuth?.user?.name}
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
          <ChangePasswordCard userId={myAuth?.user?.id} />
        </div>

        <div className="flex">
          <AddNewUserCard />
        </div>

        <div className="flex flex-col gap-1 text-sm text-gray-500">
          <span>
            Build commit: {process.env.NEXT_PUBLIC_BUILD_COMMIT ?? 'development'}
          </span>
          <span>Build time: {process.env.NEXT_PUBLIC_BUILD_TIME ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}
