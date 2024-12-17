import LoginForm from '@/app/ui/login-form';
import { auth } from '@/auth';

export default async function LoginPage() {
  const myAuth = await auth();

  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <LoginForm auth={myAuth} />
      </div>
    </main>
  );
}
