import { describe, expect, it } from 'vitest';

import { catalogs, extractIcuArgs, flattenMessages, LOCALES } from '@/app/lib/i18n';
import { enMessages } from '@/app/lib/i18n/ref';

const refKeys = new Set(
  Object.keys(flattenMessages(enMessages as unknown as Record<string, unknown>)),
);
const refKeysSorted = [...refKeys].sort();

const languageModules = LOCALES.filter((locale) => locale !== 'en').map((locale) => {
  const messages = flattenMessages(
    catalogs[locale] as unknown as Record<string, unknown>,
  );
  return [locale, messages] as const;
});

describe('ref (translation keys)', () => {
  it('has at least one key', () => {
    expect(refKeys.size).toBeGreaterThan(0);
  });

  it('registers every non-English catalog', () => {
    expect(languageModules.length).toBe(LOCALES.length - 1);
  });

  describe.each(languageModules)('"%s" translations', (_lang, messages) => {
    describe('has exactly the same keys as ref (no more, no less)', () => {
      const langKeys = Object.keys(messages);
      const langKeysSet = new Set(langKeys);
      const langKeysSorted = [...langKeys].sort();

      const missing = refKeysSorted.filter((k) => !langKeysSet.has(k));
      const extra = langKeysSorted.filter((k) => !refKeys.has(k));

      it('should have no missing keys', () => {
        expect(missing).toEqual([]);
      });

      it('should have no extra keys', () => {
        expect(extra).toEqual([]);
      });

      it('should have the same number of keys as ref', () => {
        expect(langKeys).toHaveLength(refKeys.size);
      });
    });

    describe('has the same ICU argument names as ref', () => {
      const mismatches: { key: string; en: string[]; lang: string[] }[] = [];
      for (const key of refKeysSorted) {
        const enArgs = extractIcuArgs(
          flattenMessages(enMessages as unknown as Record<string, unknown>)[key],
        );
        const langArgs = extractIcuArgs(messages[key]);
        if (enArgs.join(',') !== langArgs.join(',')) {
          mismatches.push({ key, en: enArgs, lang: langArgs });
        }
      }

      it('should have matching ICU arguments for every key', () => {
        expect(mismatches).toEqual([]);
      });
    });
  });
});
