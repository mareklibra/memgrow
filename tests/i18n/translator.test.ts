import { describe, expect, it } from 'vitest';

import { catalogs, createTranslator } from '@/app/lib/i18n';

describe('createTranslator', () => {
  it('returns a simple English string', () => {
    const t = createTranslator('en');
    expect(t('common.cancel')).toBe('Cancel');
  });

  it('interpolates values', () => {
    const t = createTranslator('en');
    expect(t('nav.settingsWithName', { name: 'Ada' })).toBe('Settings (Ada)');
  });

  it('formats English plurals', () => {
    const t = createTranslator('en');
    expect(t('edit.found', { count: 1 })).toBe('Found 1 word');
    expect(t('edit.found', { count: 0 })).toBe('Found 0 words');
    expect(t('edit.found', { count: 5 })).toBe('Found 5 words');
  });

  it('formats Czech plurals (one / few / other per CLDR)', () => {
    const t = createTranslator('cs');
    expect(t('edit.found', { count: 1 })).toBe('Nalezeno 1 slovo');
    expect(t('edit.found', { count: 2 })).toBe('Nalezena 2 slova');
    expect(t('edit.found', { count: 3 })).toBe('Nalezena 3 slova');
    expect(t('edit.found', { count: 4 })).toBe('Nalezena 4 slova');
    expect(t('edit.found', { count: 5 })).toBe('Nalezeno 5 slov');
    expect(t('edit.found', { count: 0 })).toBe('Nalezeno 0 slov');
    // CLDR Czech: only 1 is "one"; 21 and 22–24 are "other", unlike Polish/Russian.
    expect(t('edit.found', { count: 21 })).toBe('Nalezeno 21 slov');
    expect(t('edit.found', { count: 22 })).toBe('Nalezeno 22 slov');
    expect(t('edit.found', { count: 24 })).toBe('Nalezeno 24 slov');
    expect(t('edit.found', { count: 25 })).toBe('Nalezeno 25 slov');
  });

  it('falls back to English for an unknown locale', () => {
    const t = createTranslator('de');
    expect(t('common.cancel')).toBe('Cancel');
  });

  it('returns the key when the message is missing', () => {
    const t = createTranslator('en');
    expect(t('does.not.exist' as 'common.cancel')).toBe('does.not.exist');
  });

  it('falls back to English when a Czech message is missing at runtime', () => {
    const csCommon = catalogs.cs.common as { cancel: string };
    const original = csCommon.cancel;
    csCommon.cancel = undefined as unknown as string;
    try {
      const t = createTranslator('cs');
      expect(t('common.cancel')).toBe('Cancel');
    } finally {
      csCommon.cancel = original;
    }
  });
});
