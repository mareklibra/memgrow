import { lusitana } from '@/app/ui/fonts';
import { signOut, auth } from '@/auth';

// import {  } from '@/app/lib/data';
// import { getSpecialKeys } from '@/app/lib/utils';
// import { IterateWords } from '@/app/ui/IterateWords';
import SignoutButton from '../ui/SignoutButton';
import { ChangePasswordCard } from '../ui/ChangePasswordCard';

export default async function Page() {
  const myAuth = await auth();
  const isLoggedIn = !!myAuth;

  const handleSignOut = async () => {
    'use server';
    await signOut();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row w-11/12">
        <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
          Settings for {myAuth?.user?.name}
        </h1>
        <div className="grow"></div>
        <SignoutButton
          className="flex items-center justify-left rounded-md text-sm font-medium"
          isLoggedIn={isLoggedIn}
          handleSignOut={handleSignOut}
        />
      </div>

      <div className="flex grow h-full w-11/12">
        <ChangePasswordCard userId={myAuth?.user?.id} />
      </div>
    </div>
  );
}
