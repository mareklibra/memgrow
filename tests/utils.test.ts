import { describe, it, expect } from 'vitest';
import { Word } from '@/app/lib/definitions';
import {
  assertNever,
  formatDateToLocal,
  formatMemLevel,
  getMemLevelFromRepeat,
  getSpecialKeys,
  getWordSimilarities,
  getWordSimilarity,
  longestCommonPrefix,
  shuffleArray,
} from '@/app/lib/utils';

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 'w1',
    courseId: 'c1',
    word: 'hello',
    definition: 'hola',
    memLevel: 5,
    form: 'show',
    repeatAgain: new Date('2025-01-01'),
    isPriority: false,
    isSkipped: false,
    ...overrides,
  };
}

describe('utils', () => {
  // ── longestCommonPrefix ─────────────────────────────────────────────
  describe('longestCommonPrefix', () => {
    it('returns full string when both strings are identical', () => {
      expect(longestCommonPrefix('abc', 'abc')).toBe('abc');
    });

    it('returns common prefix for partially matching strings', () => {
      expect(longestCommonPrefix('abcdef', 'abcxyz')).toBe('abc');
    });

    it('returns empty string when no common prefix', () => {
      expect(longestCommonPrefix('xyz', 'abc')).toBe('');
    });

    it('returns empty string when first string is empty', () => {
      expect(longestCommonPrefix('', 'abc')).toBe('');
    });

    it('returns empty string when second string is empty', () => {
      expect(longestCommonPrefix('abc', '')).toBe('');
    });

    it('returns empty string when both strings are empty', () => {
      expect(longestCommonPrefix('', '')).toBe('');
    });

    it('handles single-character match', () => {
      expect(longestCommonPrefix('a', 'ab')).toBe('a');
    });

    it('is case-sensitive', () => {
      expect(longestCommonPrefix('Abc', 'abc')).toBe('');
    });

    it('handles unicode characters', () => {
      expect(longestCommonPrefix('über', 'übel')).toBe('übe');
      expect(longestCommonPrefix('naïve', 'naïf')).toBe('naï');
    });

    it('returns shorter string when it is a prefix of the longer one', () => {
      expect(longestCommonPrefix('abc', 'abcdef')).toBe('abc');
    });
  });

  // ── getSpecialKeys ──────────────────────────────────────────────────
  describe('getSpecialKeys', () => {
    it('returns empty array for words with only ASCII letters and spaces', () => {
      const words = [makeWord({ word: 'hello world' }), makeWord({ word: 'foo bar' })];
      expect(getSpecialKeys(words)).toEqual([]);
    });

    it('extracts accented characters', () => {
      const words = [makeWord({ word: 'café' })];
      const keys = getSpecialKeys(words);
      expect(keys).toContain('é');
    });

    it('extracts German umlauts', () => {
      const words = [makeWord({ word: 'über' }), makeWord({ word: 'Straße' })];
      const keys = getSpecialKeys(words);
      expect(keys).toContain('ü');
      expect(keys).toContain('ß');
    });

    it('deduplicates special keys across words', () => {
      const words = [makeWord({ word: 'café' }), makeWord({ word: 'résumé' })];
      const keys = getSpecialKeys(words);
      const eAcuteCount = keys.filter((k) => k === 'é').length;
      expect(eAcuteCount).toBe(1);
    });

    it('returns empty array for empty word list', () => {
      expect(getSpecialKeys([])).toEqual([]);
    });

    it('extracts punctuation and digits as special keys', () => {
      const words = [makeWord({ word: 'hello-world' }), makeWord({ word: 'test123' })];
      const keys = getSpecialKeys(words);
      expect(keys).toContain('-');
      expect(keys).toContain('1');
      expect(keys).toContain('2');
      expect(keys).toContain('3');
    });
  });

  // ── getWordSimilarities ─────────────────────────────────────────────
  describe('getWordSimilarities', () => {
    it('returns all words with similarity scores', () => {
      const words = [
        makeWord({ id: 'w1', word: 'hello' }),
        makeWord({ id: 'w2', word: 'help' }),
        makeWord({ id: 'w3', word: 'world' }),
      ];
      const result = getWordSimilarities(words, { id: 'w1', word: 'hello' });
      expect(result).toHaveLength(3);
      result.forEach((r) => {
        expect(r).toHaveProperty('similarity');
        expect(typeof r.similarity).toBe('number');
      });
    });

    it('assigns 0 similarity to the word itself (self-exclusion)', () => {
      const words = [
        makeWord({ id: 'w1', word: 'hello' }),
        makeWord({ id: 'w2', word: 'hello' }),
      ];
      const result = getWordSimilarities(words, { id: 'w1', word: 'hello' });
      const self = result.find((r) => r.id === 'w1');
      expect(self?.similarity).toBe(0);
    });

    it('sorts by similarity descending', () => {
      const words = [
        makeWord({ id: 'w1', word: 'test' }),
        makeWord({ id: 'w2', word: 'testing' }),
        makeWord({ id: 'w3', word: 'xyz' }),
      ];
      const result = getWordSimilarities(words, { id: 'w1', word: 'test' });
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].similarity).toBeGreaterThanOrEqual(result[i].similarity);
      }
    });

    it('identical (non-self) words have high similarity', () => {
      const words = [
        makeWord({ id: 'w1', word: 'hello' }),
        makeWord({ id: 'w2', word: 'hello' }),
      ];
      const result = getWordSimilarities(words, { id: 'w1', word: 'hello' });
      const other = result.find((r) => r.id === 'w2');
      expect(other?.similarity).toBe(1);
    });

    it('handles empty word list', () => {
      const result = getWordSimilarities([], { id: 'w1', word: 'hello' });
      expect(result).toEqual([]);
    });
  });

  // ── getWordSimilarity ───────────────────────────────────────────────
  describe('getWordSimilarity', () => {
    it('returns highest similarity score', () => {
      const words = [
        makeWord({ id: 'w1', word: 'test' }),
        makeWord({ id: 'w2', word: 'testing' }),
        makeWord({ id: 'w3', word: 'xyz' }),
      ];
      const result = getWordSimilarity(words, { id: 'w1', word: 'test' });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('returns undefined for empty word list', () => {
      const result = getWordSimilarity([], { id: 'w1', word: 'hello' });
      expect(result).toBeUndefined();
    });

    it('returns 0 when only the word itself is in the list', () => {
      const words = [makeWord({ id: 'w1', word: 'hello' })];
      const result = getWordSimilarity(words, { id: 'w1', word: 'hello' });
      expect(result).toBe(0);
    });
  });

  // ── formatDateToLocal ───────────────────────────────────────────────
  describe('formatDateToLocal', () => {
    it('formats a date string with default locale (en-US)', () => {
      const result = formatDateToLocal('2025-06-15');
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
    });

    it('respects a custom locale', () => {
      const result = formatDateToLocal('2025-01-15', 'de-DE');
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
    });
  });

  // ── formatMemLevel ──────────────────────────────────────────────────
  describe('formatMemLevel', () => {
    it('formats integer as one decimal place', () => {
      expect(formatMemLevel(5)).toBe('5.0');
    });

    it('formats float with one decimal place', () => {
      expect(formatMemLevel(3.14)).toBe('3.1');
    });

    it('formats zero', () => {
      expect(formatMemLevel(0)).toBe('0.0');
    });
  });

  // ── shuffleArray ────────────────────────────────────────────────────
  describe('shuffleArray', () => {
    it('preserves array length', () => {
      const arr = [1, 2, 3, 4, 5];
      shuffleArray(arr);
      expect(arr).toHaveLength(5);
    });

    it('preserves all elements (same set)', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffleArray(arr);
      expect(arr.sort()).toEqual(original.sort());
    });

    it('mutates the array in place', () => {
      const arr = [1, 2, 3, 4, 5];
      const ref = arr;
      shuffleArray(arr);
      expect(ref).toBe(arr);
    });

    it('handles empty array', () => {
      const arr: number[] = [];
      shuffleArray(arr);
      expect(arr).toEqual([]);
    });

    it('handles single-element array', () => {
      const arr = [42];
      shuffleArray(arr);
      expect(arr).toEqual([42]);
    });

    it('eventually produces a different order (probabilistic)', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const original = [...arr];
      let changed = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const copy = [...original];
        shuffleArray(copy);
        if (JSON.stringify(copy) !== JSON.stringify(original)) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    });
  });

  // ── assertNever ─────────────────────────────────────────────────────
  describe('assertNever', () => {
    it('throws an error with the unexpected value', () => {
      expect(() => assertNever('oops' as never)).toThrow('Unexpected value: oops');
    });
  });

  // ── getMemLevelFromRepeat ───────────────────────────────────────────
  describe('getMemLevelFromRepeat', () => {
    it('returns 0 for repeat < 1 (new word)', () => {
      expect(getMemLevelFromRepeat(0)).toBe(0);
      expect(getMemLevelFromRepeat(-1)).toBe(0);
      expect(getMemLevelFromRepeat(0.5)).toBe(0);
    });

    it('returns 2 for repeat in [1, 2) (recently learned)', () => {
      expect(getMemLevelFromRepeat(1)).toBe(2);
      expect(getMemLevelFromRepeat(1.5)).toBe(2);
    });

    it('returns repeat value for repeat in [2, 60]', () => {
      expect(getMemLevelFromRepeat(2)).toBe(2);
      expect(getMemLevelFromRepeat(30)).toBe(30);
      expect(getMemLevelFromRepeat(60)).toBe(60);
    });

    it('returns repeat value for repeat > 60', () => {
      expect(getMemLevelFromRepeat(61)).toBe(61);
      expect(getMemLevelFromRepeat(100)).toBe(100);
    });
  });
});
