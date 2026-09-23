import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMailConfigured, sendPasswordResetEmail } from '@/app/lib/mailer';

describe('mailer', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('isMailConfigured requires both trimmed env vars', () => {
    vi.stubEnv('RESEND_API_KEY', 're_x');
    vi.stubEnv('MAIL_FROM', 'a@b.c');
    expect(isMailConfigured()).toBe(true);
    vi.stubEnv('MAIL_FROM', '  ');
    expect(isMailConfigured()).toBe(false);
  });

  it('treats non-2xx as failure and does not log the reset URL', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_x');
    vi.stubEnv('MAIL_FROM', 'MemGrow <noreply@example.com>');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      }),
    );

    const resetUrl = 'http://localhost:3000/reset-password?token=secret-token-value';
    const result = await sendPasswordResetEmail({
      to: 'user@test.com',
      resetUrl,
      locale: 'en',
    });
    expect(result).toEqual({ ok: false });
    const logged = error.mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('secret-token-value');
    expect(logged).not.toContain(resetUrl);
    error.mockRestore();
  });

  it('treats fetch timeout as failure', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_x');
    vi.stubEnv('MAIL_FROM', 'MemGrow <noreply@example.com>');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'TimeoutError')),
    );
    const result = await sendPasswordResetEmail({
      to: 'user@test.com',
      resetUrl: 'http://localhost:3000/reset-password?token=secret',
      locale: 'en',
    });
    expect(result).toEqual({ ok: false });
    vi.mocked(console.error).mockRestore();
  });
});
