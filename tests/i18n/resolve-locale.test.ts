import { describe, expect, it } from 'vitest';

import { parseAcceptLanguage, resolveLocale } from '@/app/lib/i18n';

describe('parseAcceptLanguage', () => {
  it('returns cs for a Czech header', () => {
    expect(parseAcceptLanguage('cs-CZ,cs;q=0.9,en;q=0.8')).toBe('cs');
  });

  it('returns en for an English header', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('returns en for an unsupported language', () => {
    expect(parseAcceptLanguage('de-DE,de;q=0.9')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage('')).toBeNull();
  });

  it('respects q-values', () => {
    expect(parseAcceptLanguage('en;q=0.2,cs;q=0.8')).toBe('cs');
  });
});

describe('resolveLocale', () => {
  it('uses the cookie when logged out', () => {
    const result = resolveLocale({
      cookie: 'cs',
      acceptLanguage: 'en-US',
      loggedIn: false,
    });
    expect(result.locale).toBe('cs');
    expect(result.shouldPersistToCookie).toBe(false);
    expect(result.shouldPersistToDb).toBe(false);
  });

  it('uses Accept-Language when logged out and there is no cookie', () => {
    const result = resolveLocale({
      acceptLanguage: 'cs-CZ,cs;q=0.9,en;q=0.8',
      loggedIn: false,
    });
    expect(result.locale).toBe('cs');
  });

  it('defaults to English when nothing matches', () => {
    const result = resolveLocale({
      acceptLanguage: 'de-DE',
      loggedIn: false,
    });
    expect(result.locale).toBe('en');
  });

  it('ignores DB locale while impersonating', () => {
    const result = resolveLocale({
      cookie: 'en',
      dbLocale: 'cs',
      loggedIn: true,
      impersonating: true,
    });
    expect(result.locale).toBe('en');
    expect(result.shouldPersistToCookie).toBe(false);
    expect(result.shouldPersistToDb).toBe(false);
  });

  it('lets cookie win over DB after a language switch', () => {
    const result = resolveLocale({
      cookie: 'en',
      dbLocale: 'cs',
      loggedIn: true,
      impersonating: false,
    });
    expect(result.locale).toBe('en');
    expect(result.shouldPersistToDb).toBe(true);
  });

  it('uses DB locale when the cookie is missing after password login', () => {
    const result = resolveLocale({
      dbLocale: 'cs',
      acceptLanguage: 'en-US',
      loggedIn: true,
      impersonating: false,
    });
    expect(result.locale).toBe('cs');
    expect(result.shouldPersistToCookie).toBe(true);
    expect(result.shouldPersistToDb).toBe(false);
  });

  it('persists resolved locale to DB when logged in and DB is null', () => {
    const result = resolveLocale({
      cookie: 'cs',
      dbLocale: null,
      loggedIn: true,
      impersonating: false,
    });
    expect(result.locale).toBe('cs');
    expect(result.shouldPersistToCookie).toBe(false);
    expect(result.shouldPersistToDb).toBe(true);
  });
});
