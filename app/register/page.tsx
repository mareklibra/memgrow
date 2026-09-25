import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import RegisterForm from '@/app/ui/register-form';

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/');
  }

  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <RegisterForm />
      </div>
    </main>
  );
}
