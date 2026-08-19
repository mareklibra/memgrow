'use server';

import { sql } from '@/app/lib/db';
import bcrypt from 'bcrypt';
import { AuthError } from 'next-auth';

import { auth, signIn } from '@/auth';
import { isUserAdmin } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      const { t } = await getI18n();
      switch (error.type) {
        case 'CredentialsSignin':
          return t('auth.invalidCredentials');
        default:
          return t('auth.somethingWentWrong');
      }
    }
    throw error;
  }
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    await sql`
        UPDATE users
        SET password = ${hashedPassword}
        WHERE id = ${userId}
      `;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to change user password'),
    };
  }
}

export async function addNewUser(user: {
  name: string;
  email: string;
  password: string;
}) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  try {
    await sql`
        INSERT INTO users (name, email, password)
        VALUES (${user.name.trim()}, ${user.email.trim()}, ${hashedPassword})
      `;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to add new user'),
    };
  }
}

export async function impersonateUser(targetUserId: string) {
  const { t } = await getI18n();
  const session = await auth();
  if (!session?.user?.id) {
    return { message: t('errors.notAuthenticated') };
  }

  const adminValid = await isUserAdmin(session.user.id);
  if (!adminValid) {
    return { message: t('errors.notAuthorizedAdmin') };
  }

  const result = await sql<{ email: string }>`
    SELECT email FROM users WHERE id = ${targetUserId}
  `;
  const targetEmail = result.rows[0]?.email;
  if (!targetEmail) {
    return { message: t('errors.targetUserNotFound') };
  }

  try {
    await signIn('credentials', {
      email: targetEmail,
      impersonateByAdminId: session.user.id,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: t('errors.impersonationFailed') };
    }
    throw error;
  }
}
