'use server';

import { sql } from '@/app/lib/db';
import bcrypt from 'bcrypt';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { auth, signIn, signOut } from '@/auth';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';
import { isUserAdmin } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';

const emailSchema = z.string().email();

type AuthzOk = { ok: true; userId: string };
type AuthzErr = { ok: false; message: string };

async function requireSession(): Promise<AuthzOk | AuthzErr> {
  const session = await auth();
  if (!session?.user?.id) {
    const { t } = await getI18n();
    return { ok: false, message: t('errors.notAuthenticated') };
  }
  return { ok: true, userId: session.user.id };
}

async function requireAdmin(): Promise<AuthzOk | AuthzErr> {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return sessionResult;
  const adminValid = await isUserAdmin(sessionResult.userId);
  if (!adminValid) {
    const { t } = await getI18n();
    return { ok: false, message: t('errors.notAuthorizedAdmin') };
  }
  return sessionResult;
}

async function rejectShortPassword(password: string): Promise<string | undefined> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    const { t } = await getI18n();
    return t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH });
  }
}

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

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const sessionResult = await requireSession();
  if (!sessionResult.ok) return { message: sessionResult.message };

  const short = await rejectShortPassword(newPassword);
  if (short) return { message: short };

  const { t } = await getI18n();
  try {
    const result = await sql<{ password: string }>`
      SELECT password FROM users WHERE id = ${sessionResult.userId}
    `;
    const hash = result.rows[0]?.password;
    if (!hash) {
      return { message: t('errors.notAuthenticated') };
    }

    const currentOk = await bcrypt.compare(currentPassword, hash);
    if (!currentOk) {
      return { message: t('errors.incorrectCurrentPassword') };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await sql`
      UPDATE users
      SET password = ${hashedPassword},
          token_version = token_version + 1
      WHERE id = ${sessionResult.userId}
    `;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to change user password'),
    };
  }

  await signOut({ redirectTo: '/login' });
}

export async function adminSetUserPassword(userId: string, newPassword: string) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) return { message: adminResult.message };

  const { t } = await getI18n();
  if (userId === adminResult.userId) {
    return { message: t('errors.cannotSetOwnPassword') };
  }

  const short = await rejectShortPassword(newPassword);
  if (short) return { message: short };

  try {
    const existing = await sql<{ id: string }>`
      SELECT id FROM users WHERE id = ${userId}
    `;
    if (!existing.rows[0]) {
      return { message: t('errors.targetUserNotFound') };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await sql`
      UPDATE users
      SET password = ${hashedPassword},
          token_version = token_version + 1
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
  const adminResult = await requireAdmin();
  if (!adminResult.ok) return { message: adminResult.message };

  const { t } = await getI18n();
  const name = user.name.trim();
  const email = user.email.trim().toLowerCase();
  if (!name) {
    return { message: t('errors.emptyName') };
  }
  if (!emailSchema.safeParse(email).success) {
    return { message: t('errors.invalidEmail') };
  }

  const short = await rejectShortPassword(user.password);
  if (short) return { message: short };

  const hashedPassword = await bcrypt.hash(user.password, 10);
  try {
    await sql`
        INSERT INTO users (name, email, password)
        VALUES (${name}, ${email}, ${hashedPassword})
      `;
    revalidatePath('/settings');
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to add new user'),
    };
  }
}

export async function deleteUser(userId: string) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) return { message: adminResult.message };

  const { t } = await getI18n();
  try {
    const existing = await sql<{ id: string }>`
      SELECT id FROM users WHERE id = ${userId}
    `;
    const target = existing.rows[0];
    if (!target) {
      return { message: t('errors.targetUserNotFound') };
    }

    if (userId === adminResult.userId) {
      return { message: t('errors.cannotDeleteSelf') };
    }

    await sql`DELETE FROM users WHERE id = ${userId}`;
    revalidatePath('/settings');
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to delete user'),
    };
  }
}

export async function impersonateUser(targetUserId: string) {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) return { message: adminResult.message };

  const { t } = await getI18n();
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
      impersonateByAdminId: adminResult.userId,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: t('errors.impersonationFailed') };
    }
    throw error;
  }
}
