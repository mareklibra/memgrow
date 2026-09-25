import NavLinks from '@/app/ui/nav-links';
import { canChangeSharedDicts } from '@/app/lib/data';
import { auth } from '@/auth';

export default async function SideNav() {
  const myAuth = await auth();
  const isLoggedIn = !!myAuth;
  const canEditShared = myAuth?.user?.id
    ? await canChangeSharedDicts(myAuth.user.id)
    : false;

  return (
    <div className="flex h-full flex-col px-3 py-0 md:py-4 md:px-2">
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks
          isLoggedIn={isLoggedIn}
          userName={myAuth?.user?.name ?? ''}
          canChangeSharedDicts={canEditShared}
        />
      </div>
    </div>
  );
}
