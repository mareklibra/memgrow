import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { getUserForAuth, isUserAdmin } from '@/app/lib/data';

import { authConfig } from './auth.config';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
  impersonateByAdminId: z.string().uuid().optional(),
});

export async function authorize(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    console.log('Invalid credentials schema');
    return null;
  }

  const { email, password, impersonateByAdminId } = parsed.data;

  if (impersonateByAdminId) {
    const adminIsValid = await isUserAdmin(impersonateByAdminId);
    if (!adminIsValid) {
      console.log('Impersonation denied: requester is not admin');
      return null;
    }
    const user = await getUserForAuth(email);
    if (!user) return null;
    return { ...user, impersonating: true };
  }

  if (!password) {
    console.log('Invalid credentials: no password');
    return null;
  }

  const user = await getUserForAuth(email);
  if (!user) return null;

  const passwordsMatch = await bcrypt.compare(password, user.password);
  if (passwordsMatch) return { ...user, impersonating: false };

  console.log('Invalid credentials');
  return null;
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      authorize,
    }),
  ],
});
