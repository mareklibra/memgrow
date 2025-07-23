import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

import { auth } from '@/auth';
import { lusitana } from './ui/fonts';

export default async function Page() {
  const myAuth = await auth();
  const isLoggedIn = !!myAuth;

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        <div className="flex flex-col justify-center gap-6 rounded-lg bg-gray-50 px-6 py-10 w-screen md:px-20">
          <p
            className={`text-xl text-gray-800 md:text-3xl md:leading-normal ${lusitana.className}`}
          >
            <strong>Welcome to the MemGrow app</strong>
          </p>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="flex items-center gap-5 self-start rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-400 md:text-base"
            >
              <span>Log in</span> <ArrowRightIcon className="w-5 md:w-6" />
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
