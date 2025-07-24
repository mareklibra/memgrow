import { lusitana } from '@/app/ui/fonts';
import { signOut, auth } from '@/auth';

// import {  } from '@/app/lib/data';
// import { getSpecialKeys } from '@/app/lib/utils';
// import { IterateWords } from '@/app/ui/IterateWords';
import SignoutButton from '../ui/SignoutButton';

export default async function Page() {
  const myAuth = await auth();
  const isLoggedIn = !!myAuth;

  const handleSignOut = async () => {
    'use server';
    await signOut();
  };

  return (
    <div className="flex flex-row h-full">
      <div className="flex flex-row w-11/12">
        <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Settings</h1>
        <div className="grow"></div>
        <SignoutButton
          className="flex items-center justify-left rounded-md text-sm font-medium"
          isLoggedIn={isLoggedIn}
          handleSignOut={handleSignOut}
          userName={myAuth?.user?.name}
        />
      </div>
    </div>
  );
}
