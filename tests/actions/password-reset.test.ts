import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import {
  adminSetUserPassword,
  changeOwnPassword,
  requestPasswordReset,
  resetPasswordWithToken,
} from '@/app/lib/actions';
import { hashResetToken } from '@/app/lib/reset-token';
import { sql } from '@/app/lib/db';
import { sendPasswordResetEmail } from '@/app/lib/mailer';
import { truncateAll } from '../setup/db';
import { createTestUser } from '../fixtures/factories';
import { mockAuthUser } from '../setup/auth-mock';
import { auth, signOut } from '@/auth';
import { fetchUserTokenVersion, getUserForAuth } from '@/app/lib/data';
import { headers } from 'next/headers';
import { createTranslator } from '@/app/lib/i18n';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';

vi.mock('@/app/lib/mailer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/mailer')>();
  return {
    ...actual,
    sendPasswordResetEmail: vi.fn(),
  };
});

const t = createTranslator('en');

const defaultSession = {
  user: {
    id: mockAuthUser.id,
    name: mockAuthUser.name,
    email: mockAuthUser.email,
  },
};

function form(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

async function tokenCount(userId?: string): Promise<number> {
  const result = userId
    ? await sql<{ c: number }>`
        SELECT count(*)::int AS c FROM password_reset_tokens WHERE user_id = ${userId}
      `
    : await sql<{ c: number }>`SELECT count(*)::int AS c FROM password_reset_tokens`;
  return Number(result.rows[0]?.c ?? 0);
}

async function bumpEmailGap(email: string): Promise<void> {
  await sql.query(
    `UPDATE password_reset_rate_limits
     SET last_attempt_at = now() - interval '3 minutes'
     WHERE kind = 'email' AND key = $1`,
    [email],
  );
}

describe('password reset', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.mocked(auth).mockResolvedValue(defaultSession as never);
    vi.mocked(signOut).mockClear();
    vi.mocked(sendPasswordResetEmail).mockReset();
    vi.mocked(sendPasswordResetEmail).mockResolvedValue({ ok: true });
    vi.stubEnv('AUTH_URL', 'http://localhost:3000');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('MAIL_FROM', 'MemGrow <noreply@example.com>');
    vi.mocked(headers).mockResolvedValue({
      get: () => null,
    } as never);
  });

  afterEach(async () => {
    await truncateAll();
    vi.unstubAllEnvs();
  });

  it('returns sent and does not call Resend for an unknown email', async () => {
    const result = await requestPasswordReset(undefined, form({ email: 'nobody@test.com' }));
    expect(result.status).toBe('sent');
    expect(result.message).toBe(t('auth.resetEmailSent'));
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(await tokenCount()).toBe(0);
  });

  it('mints a token and sends mail for a known email', async () => {
    await createTestUser();
    const result = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email }),
    );
    expect(result.status).toBe('sent');
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(sendPasswordResetEmail).mock.calls[0][0];
    expect(arg.to).toBe(mockAuthUser.email);
    expect(arg.resetUrl).toMatch(/^http:\/\/localhost:3000\/reset-password\?token=/);
    expect(await tokenCount(mockAuthUser.id)).toBe(1);
  });

  it('does not mint when AUTH_URL is whitespace', async () => {
    await createTestUser();
    vi.stubEnv('AUTH_URL', '   ');
    const result = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email }),
    );
    expect(result.status).toBe('unavailable');
    expect(result.message).toBe(t('auth.resetEmailUnavailable'));
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(await tokenCount()).toBe(0);
  });

  it('does not mint in production when mail is unconfigured', async () => {
    await createTestUser();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('MAIL_FROM', '');
    const result = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email }),
    );
    expect(result.status).toBe('unavailable');
    expect(await tokenCount()).toBe(0);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('mints and logs the URL when mail is unconfigured outside production', async () => {
    await createTestUser();
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('MAIL_FROM', '');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email }),
    );
    expect(result.status).toBe('unavailable');
    expect(await tokenCount(mockAuthUser.id)).toBe(1);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(info.mock.calls.some((c) => String(c[1] ?? c[0]).includes('reset-password?token='))).toBe(
      true,
    );
    info.mockRestore();
  });

  it('treats only one mail env var as unconfigured', async () => {
    await createTestUser();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('MAIL_FROM', '');
    const result = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email }),
    );
    expect(result.status).toBe('unavailable');
    expect(await tokenCount()).toBe(0);
  });

  it('returns sent when Resend reports failure', async () => {
    await createTestUser();
    vi.mocked(sendPasswordResetEmail).mockResolvedValue({ ok: false });
    const result = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email }),
    );
    expect(result.status).toBe('sent');
    expect(result.message).toBe(t('auth.resetEmailSent'));
    expect(await tokenCount(mockAuthUser.id)).toBe(1);
  });

  it('rate-limits a second request for the same email within two minutes, including case folding', async () => {
    await createTestUser();
    await requestPasswordReset(undefined, form({ email: mockAuthUser.email }));
    const folded = await requestPasswordReset(
      undefined,
      form({ email: mockAuthUser.email.toUpperCase() }),
    );
    expect(folded.status).toBe('rateLimited');
    expect(folded.message).toBe(t('auth.resetTryLater'));
  });

  it('enforces five requests per email per hour after skipping the two-minute gap', async () => {
    await createTestUser();
    const email = mockAuthUser.email;
    for (let i = 0; i < 5; i++) {
      const result = await requestPasswordReset(undefined, form({ email }));
      expect(result.status).toBe('sent');
      await bumpEmailGap(email);
    }
    const sixth = await requestPasswordReset(undefined, form({ email }));
    expect(sixth.status).toBe('rateLimited');
  });

  it('rejects an invalid email', async () => {
    const result = await requestPasswordReset(undefined, form({ email: 'not-an-email' }));
    expect(result.status).toBe('invalid');
    expect(result.message).toBe(t('errors.invalidEmail'));
  });

  it('resets the password, bumps token_version, and rejects reuse', async () => {
    await createTestUser({ password: 'oldpass1' });
    let resetUrl = '';
    vi.mocked(sendPasswordResetEmail).mockImplementation(async (input) => {
      resetUrl = input.resetUrl;
      return { ok: true };
    });
    await requestPasswordReset(undefined, form({ email: mockAuthUser.email }));
    const token = new URL(resetUrl).searchParams.get('token') ?? '';
    expect(token).toBeTruthy();

    const ok = await resetPasswordWithToken(
      undefined,
      form({ token, password: 'newpass1', confirm: 'newpass1' }),
    );
    expect(ok.status).toBe('ok');
    const fetched = await getUserForAuth(mockAuthUser.email);
    expect(await bcrypt.compare('newpass1', fetched!.password)).toBe(true);
    expect(await fetchUserTokenVersion(mockAuthUser.id)).toBe(1);
    expect(await tokenCount(mockAuthUser.id)).toBe(0);

    const reuse = await resetPasswordWithToken(
      undefined,
      form({ token, password: 'another1', confirm: 'another1' }),
    );
    expect(reuse.status).toBe('invalid');
    expect(await bcrypt.compare('newpass1', (await getUserForAuth(mockAuthUser.email))!.password)).toBe(
      true,
    );
  });

  it('rejects an expired token', async () => {
    await createTestUser({ password: 'oldpass1' });
    const raw = randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(raw);
    await sql.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() - interval '1 minute')`,
      [mockAuthUser.id, tokenHash],
    );
    const result = await resetPasswordWithToken(
      undefined,
      form({ token: raw, password: 'newpass1', confirm: 'newpass1' }),
    );
    expect(result.status).toBe('invalid');
    expect(await bcrypt.compare('oldpass1', (await getUserForAuth(mockAuthUser.email))!.password)).toBe(
      true,
    );
  });

  it('rejects a confirm mismatch and a short password', async () => {
    await createTestUser();
    const mismatch = await resetPasswordWithToken(
      undefined,
      form({ token: 'abc', password: 'newpass1', confirm: 'otherpass' }),
    );
    expect(mismatch.status).toBe('mismatch');
    expect(mismatch.message).toBe(t('errors.passwordMismatch'));

    const short = await resetPasswordWithToken(
      undefined,
      form({ token: 'abc', password: '12345', confirm: '12345' }),
    );
    expect(short.status).toBe('tooShort');
    expect(short.message).toBe(t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH }));
  });

  it('does not consume a token until resetPasswordWithToken runs', async () => {
    await createTestUser();
    vi.mocked(sendPasswordResetEmail).mockImplementation(async (input) => {
      expect(await tokenCount(mockAuthUser.id)).toBe(1);
      expect(input.resetUrl).toContain('token=');
      return { ok: true };
    });
    await requestPasswordReset(undefined, form({ email: mockAuthUser.email }));
    expect(await tokenCount(mockAuthUser.id)).toBe(1);
  });

  it('deletes outstanding reset tokens when the user changes their password', async () => {
    await createTestUser({ password: 'oldpass1' });
    await requestPasswordReset(undefined, form({ email: mockAuthUser.email }));
    expect(await tokenCount(mockAuthUser.id)).toBe(1);
    await changeOwnPassword('oldpass1', 'newpass1');
    expect(await tokenCount(mockAuthUser.id)).toBe(0);
  });

  it('deletes outstanding reset tokens when an admin sets the password', async () => {
    await createTestUser({ is_admin: true, password: 'adminpass' });
    const other = await createTestUser({
      id: crypto.randomUUID(),
      email: 'other@test.com',
      password: 'oldpass1',
    });
    await requestPasswordReset(undefined, form({ email: 'other@test.com' }));
    expect(await tokenCount(other.id)).toBe(1);
    await adminSetUserPassword(other.id, 'newpass1');
    expect(await tokenCount(other.id)).toBe(0);
  });
});

describe('hashResetToken', () => {
  it('is sha256 hex', () => {
    const raw = 'abc';
    expect(hashResetToken(raw)).toBe(createHash('sha256').update(raw).digest('hex'));
  });
});
