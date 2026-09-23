'use server';

import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcrypt';

import { sql } from '@/app/lib/db';
import { getUserForAuth } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import {
  getPublicAuthUrl,
  isMailConfigured,
  sendPasswordResetEmail,
} from '@/app/lib/mailer';
import { rejectShortPassword } from '@/app/lib/password-policy';
import { hashResetToken } from '@/app/lib/reset-token';

export type PasswordResetRequestStatus =
  | 'unavailable'
  | 'rateLimited'
  | 'invalid'
  | 'sent';

export type PasswordResetRequestState = {
  status: PasswordResetRequestStatus;
  message: string;
};

export type ResetPasswordStatus = 'invalid' | 'mismatch' | 'tooShort' | 'ok';

export type ResetPasswordState = {
  status: ResetPasswordStatus;
  message: string;
};

function clientIpFromForwarded(forwarded: string | null): string {
  const first = forwarded?.split(',')[0]?.trim();
  return first || 'unknown';
}

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

async function applyRateLimit(
  kind: 'email' | 'ip',
  key: string,
): Promise<boolean> {
  const hourCap = kind === 'email' ? 5 : 20;
  const gapClause =
    kind === 'email'
      ? `AND (now() - password_reset_rate_limits.last_attempt_at >= interval '2 minutes')`
      : '';

  const result = await sql.query(
    `INSERT INTO password_reset_rate_limits (kind, key, last_attempt_at, window_start, count)
     VALUES ($1, $2, now(), now(), 1)
     ON CONFLICT (kind, key) DO UPDATE SET
       last_attempt_at = now(),
       count = CASE
         WHEN password_reset_rate_limits.window_start <= now() - interval '1 hour' THEN 1
         ELSE password_reset_rate_limits.count + 1
       END,
       window_start = CASE
         WHEN password_reset_rate_limits.window_start <= now() - interval '1 hour' THEN now()
         ELSE password_reset_rate_limits.window_start
       END
     WHERE (
       password_reset_rate_limits.window_start <= now() - interval '1 hour'
       OR password_reset_rate_limits.count < $3
     ) ${gapClause}
     RETURNING kind`,
    [kind, key, hourCap],
  );

  return (result.rowCount ?? 0) > 0;
}

async function mintResetToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  const tokenHash = hashResetToken(raw);
  await sql.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, now() + interval '1 hour', now())
     ON CONFLICT (user_id) DO UPDATE SET
       token_hash = EXCLUDED.token_hash,
       expires_at = EXCLUDED.expires_at,
       created_at = EXCLUDED.created_at`,
    [userId, tokenHash],
  );
  return raw;
}

export async function requestPasswordReset(
  _prev: PasswordResetRequestState | undefined,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const { t } = await getI18n();
  const email = formString(formData, 'email').trim().toLowerCase();

  if (!z.string().email().safeParse(email).success) {
    return { status: 'invalid', message: t('errors.invalidEmail') };
  }

  const authUrl = getPublicAuthUrl();
  if (!authUrl) {
    return {
      status: 'unavailable',
      message: t('auth.resetEmailUnavailable'),
    };
  }

  const mailConfigured = isMailConfigured();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!mailConfigured && isProduction) {
    return {
      status: 'unavailable',
      message: t('auth.resetEmailUnavailable'),
    };
  }

  if (!mailConfigured) {
    const user = await getUserForAuth(email);
    if (user?.id) {
      const raw = await mintResetToken(user.id);
      console.info(
        'Password reset URL (mail unconfigured, non-production):',
        `${authUrl}/reset-password?token=${raw}`,
      );
    }
    return {
      status: 'unavailable',
      message: t('auth.resetEmailUnavailable'),
    };
  }

  const headerStore = await headers();
  const ip = clientIpFromForwarded(headerStore.get('x-forwarded-for'));
  const emailAllowed = await applyRateLimit('email', email);
  const ipAllowed = await applyRateLimit('ip', ip);
  if (!emailAllowed || !ipAllowed) {
    return { status: 'rateLimited', message: t('auth.resetTryLater') };
  }

  const user = await getUserForAuth(email);
  if (user?.id && user.email) {
    const raw = await mintResetToken(user.id);
    const resetUrl = `${authUrl}/reset-password?token=${raw}`;
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      locale: user.locale,
    });
  }

  return { status: 'sent', message: t('auth.resetEmailSent') };
}

export async function resetPasswordWithToken(
  _prev: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const { t } = await getI18n();
  const rawToken = formString(formData, 'token');
  const password = formString(formData, 'password');
  const confirm = formString(formData, 'confirm');

  if (!rawToken) {
    return { status: 'invalid', message: t('auth.invalidResetToken') };
  }

  if (password !== confirm) {
    return { status: 'mismatch', message: t('errors.passwordMismatch') };
  }

  const short = await rejectShortPassword(password);
  if (short) {
    return { status: 'tooShort', message: short };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const tokenHash = hashResetToken(rawToken);
  const result = await sql<{ id: string }>`
    WITH deleted AS (
      DELETE FROM password_reset_tokens
      WHERE token_hash = ${tokenHash} AND expires_at > now()
      RETURNING user_id
    )
    UPDATE users
    SET password = ${hashedPassword},
        token_version = token_version + 1
    FROM deleted
    WHERE users.id = deleted.user_id
    RETURNING users.id
  `;

  if (!result.rows[0]) {
    return { status: 'invalid', message: t('auth.invalidResetToken') };
  }

  return { status: 'ok', message: t('auth.passwordResetSuccess') };
}

export async function deletePasswordResetTokensForUser(userId: string): Promise<void> {
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
}
