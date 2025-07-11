import NavLinks from '@/app/ui/nav-links';
import { signOut, auth } from '@/auth';
import SignoutButton from './SignoutButton';

export default async function SideNav() {
  const myAuth = await auth();
  const isLoggedIn = !!myAuth;

  const handleSignOut = async () => {
    'use server';
    await signOut();
  };

  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        <SignoutButton
          isLoggedIn={isLoggedIn}
          handleSignOut={handleSignOut}
          userName={myAuth?.user?.name}
        />
      </div>
    </div>
  );
}
