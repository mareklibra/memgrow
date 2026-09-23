import { createTranslator, DEFAULT_LOCALE, isLocale, type Locale } from '@/app/lib/i18n';

export function getPublicAuthUrl(): string | null {
  let authUrl = process.env.AUTH_URL?.trim() ?? '';
  while (authUrl.endsWith('/')) {
    authUrl = authUrl.slice(0, -1);
  }
  return authUrl || null;
}

export function isMailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  return Boolean(key && from);
}

export function resolveResetEmailLocale(locale: string | null | undefined): Locale {
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export type SendPasswordResetResult = { ok: true } | { ok: false };

/**
 * Sends a password-reset email via Resend. Never logs resetUrl or the token.
 * Non-2xx, timeout, and network errors are failures.
 */
export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  locale: string | null | undefined;
}): Promise<SendPasswordResetResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false };
  }

  const t = createTranslator(resolveResetEmailLocale(input.locale));
  const subject = t('auth.resetEmailSubject');
  const text = t('auth.resetEmailBody', { resetUrl: input.resetUrl });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.text()).slice(0, 500);
      } catch {
        detail = '';
      }
      console.error('Resend password-reset email failed', response.status, detail);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    if (message.includes(input.resetUrl) || /reset-password\?token=/.test(message)) {
      console.error('Resend password-reset email failed');
    } else {
      console.error('Resend password-reset email failed', message);
    }
    return { ok: false };
  }
}
