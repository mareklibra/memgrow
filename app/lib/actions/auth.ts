'use server';

import { sql } from '@/app/lib/db';
import bcrypt from 'bcrypt';
import { AuthError } from 'next-auth';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { auth, signIn, signOut } from '@/auth';
import { getUserForAuth, isUserAdmin } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { deletePasswordResetTokensForUser } from '@/app/lib/actions/password-reset';
import { rejectShortPassword } from '@/app/lib/password-policy';
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@/app/lib/i18n';

const emailSchema = z.string().email();

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function clientIpFromForwarded(forwarded: string | null): string {
  const first = forwarded?.split(',')[0]?.trim();
  return first || 'unknown';
}

async function registrationAllowed(ip: string): Promise<boolean> {
  const result = await sql.query(
    `INSERT INTO registration_rate_limits (ip, last_attempt_at, window_start, count)
     VALUES ($1, now(), now(), 1)
     ON CONFLICT (ip) DO UPDATE SET
       last_attempt_at = now(),
       count = CASE
         WHEN registration_rate_limits.window_start <= now() - interval '1 hour' THEN 1
         ELSE registration_rate_limits.count + 1
       END,
       window_start = CASE
         WHEN registration_rate_limits.window_start <= now() - interval '1 hour' THEN now()
         ELSE registration_rate_limits.window_start
       END
     WHERE (
       registration_rate_limits.window_start <= now() - interval '1 hour'
       OR registration_rate_limits.count < 10
     )
     RETURNING ip`,
    [ip],
  );
  return (result.rowCount ?? 0) > 0;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && (error as { code?: unknown }).code === '23505') return true;
  if ('cause' in error) return isUniqueViolation((error as { cause?: unknown }).cause);
  return false;
}

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

export async function registerUser(
  _: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const { t } = await getI18n();
  const headerStore = await headers();
  const ip = clientIpFromForwarded(headerStore.get('x-forwarded-for'));
  if (!(await registrationAllowed(ip))) return t('auth.registerTryLater');

  const name = formString(formData, 'name').trim();
  const email = formString(formData, 'email').trim().toLowerCase();
  const password = formString(formData, 'password');
  const confirm = formString(formData, 'confirm');
  const locale = formString(formData, 'locale');

  if (!name) return t('errors.emptyName');
  if (!emailSchema.safeParse(email).success) return t('errors.invalidEmail');
  const short = await rejectShortPassword(password);
  if (short) return short;
  if (password !== confirm) return t('errors.passwordMismatch');
  if (!isLocale(locale)) return t('errors.invalidLocale');

  const hashedPassword = await bcrypt.hash(password, 10);
  let userId: string;
  try {
    const existing = await getUserForAuth(email);
    if (existing) return t('auth.emailAlreadyRegistered');

    const inserted = await sql<{ id: string }>`
      INSERT INTO users (name, email, password, locale)
      VALUES (${name}, ${email}, ${hashedPassword}, ${locale})
      RETURNING id
    `;
    const id = inserted.rows[0]?.id;
    if (!id) return t('errors.generic');
    userId = id;
  } catch (error) {
    if (isUniqueViolation(error)) return t('auth.emailAlreadyRegistered');
    return genericErrorMessage(error, 'Failed to register user');
  }

  try {
    const store = await cookies();
    store.set(LOCALE_COOKIE, locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      httpOnly: true,
    });
  } catch (error) {
    console.error('Failed to set locale cookie:', error);
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      await sql`DELETE FROM users WHERE id = ${userId}`;
      return t('auth.somethingWentWrong');
    }
    throw error;
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
    await deletePasswordResetTokensForUser(sessionResult.userId);
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
    await deletePasswordResetTokensForUser(userId);
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

export async function setCanChangeSharedDicts(
  userId: string,
  allowed: boolean,
): Promise<{ message?: string }> {
  const adminResult = await requireAdmin();
  if (!adminResult.ok) return { message: adminResult.message };

  const { t } = await getI18n();
  try {
    const existing = await sql<{ is_admin: boolean }>`
      SELECT is_admin FROM users WHERE id = ${userId}
    `;
    const target = existing.rows[0];
    if (!target) return { message: t('errors.targetUserNotFound') };

    if (target.is_admin && !allowed) {
      await sql`
        UPDATE users
        SET can_change_shared_dicts = TRUE
        WHERE id = ${userId}
      `;
      return { message: t('errors.adminAlwaysCanChangeSharedDicts') };
    }

    await sql`
      UPDATE users
      SET can_change_shared_dicts = ${target.is_admin ? true : allowed}
      WHERE id = ${userId}
    `;
    revalidatePath('/settings');
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to set shared dictionary permission'),
    };
  }
  return {};
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
