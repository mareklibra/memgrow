import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { auth } from '@/auth';

import { setLocale } from '@/app/lib/actions/locale';
import { fetchUserLocale } from '@/app/lib/data';
import { truncateAll } from '../setup/db';
import { createTestUser } from '../fixtures/factories';
import { mockAuthUser } from '../setup/auth-mock';
import { LOCALE_COOKIE } from '@/app/lib/i18n';

const cookieJar = new Map<string, string>();

describe('setLocale', () => {
  beforeEach(async () => {
    await truncateAll();
    cookieJar.clear();
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => {
        const value = cookieJar.get(name);
        return value !== undefined ? { name, value } : undefined;
      },
      set: (name: string, value: string) => {
        cookieJar.set(name, value);
      },
    } as never);
  });

  afterEach(async () => {
    await truncateAll();
  });

  it('writes the cookie and users.locale when not impersonating', async () => {
    await createTestUser();
    const result = await setLocale('cs');
    expect(result.locale).toBe('cs');
    expect(cookieJar.get(LOCALE_COOKIE)).toBe('cs');
    expect(await fetchUserLocale(mockAuthUser.id)).toBe('cs');
  });

  it('rejects an unknown locale', async () => {
    const result = await setLocale('de');
    expect(result.message).toBeDefined();
    expect(result.locale).toBeUndefined();
  });

  it('does not write users.locale while impersonating', async () => {
    await createTestUser();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: mockAuthUser.id,
        name: mockAuthUser.name,
        email: mockAuthUser.email,
        impersonating: true,
      },
    } as never);

    const result = await setLocale('cs');
    expect(result.locale).toBe('cs');
    expect(cookieJar.get(LOCALE_COOKIE)).toBe('cs');
    expect(await fetchUserLocale(mockAuthUser.id)).toBeNull();
  });
});
