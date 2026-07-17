import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { TEACHING_FORMS, TeachingForm, TeachingFormCount } from '@/app/lib/definitions';
import {
  decreaseMemLevel,
  getNextForm,
  getNumericForm,
  getProgressInPercents,
  getRepeatAgainDate,
  increaseMemLevel,
} from '@/app/lib/word-transitions';
import { FORM_CORRECT_ANSWER } from '@/app/lib/form-config';
import {
  DAY_MS,
  MAX_MEM_LEVEL,
  REPEAT_SOONER_FACTOR,
  SUCCESS_INCREASE_MAX,
  SUCCESS_INCREASE_MIN,
} from '@/app/constants';

describe('word-transitions', () => {
  describe('TeachingFormCount', () => {
    it('equals the length of TEACHING_FORMS', () => {
      expect(TeachingFormCount).toBe(TEACHING_FORMS.length);
    });
  });

  describe('getNextForm', () => {
    it('returns a valid TeachingForm for every form in learn mode', () => {
      for (const form of TEACHING_FORMS) {
        const next = getNextForm(form, false);
        expect(TEACHING_FORMS as readonly string[]).toContain(next);
      }
    });

    it('returns a valid TeachingForm for every form in test mode', () => {
      for (const form of TEACHING_FORMS) {
        const next = getNextForm(form, true);
        expect(TEACHING_FORMS as readonly string[]).toContain(next);
      }
    });

    it('learn mode: expected full cycle (no write_mid)', () => {
      const expectedLearn: [TeachingForm, TeachingForm][] = [
        ['show', 'choose_4_word'],
        ['choose_4_word', 'choose_4_def'],
        ['choose_4_def', 'choose_8_def'],
        ['choose_8_def', 'write'],
        ['write', 'write_last'],
        ['write_last', 'choose_4_def'],
      ];
      for (const [from, to] of expectedLearn) {
        expect(getNextForm(from, false)).toBe(to);
      }
    });

    it('test mode: expected full cycle (includes write_mid)', () => {
      const expectedTest: [TeachingForm, TeachingForm][] = [
        ['show', 'choose_4_word'],
        ['choose_4_word', 'choose_4_def'],
        ['choose_4_def', 'write_mid'],
        ['write_mid', 'choose_8_def'],
        ['choose_8_def', 'write'],
        ['write', 'write_last'],
        ['write_last', 'choose_4_def'],
      ];
      for (const [from, to] of expectedTest) {
        expect(getNextForm(from, true)).toBe(to);
      }
    });

    it('learn mode: write_mid is never reached by cycling from show', () => {
      const visited = new Set<TeachingForm>();
      let form: TeachingForm = 'show';
      for (let i = 0; i < 20; i++) {
        visited.add(form);
        form = getNextForm(form, false);
      }
      expect(visited).not.toContain('write_mid');
    });

    it('test mode: every form is reachable by cycling from show', () => {
      const visited = new Set<TeachingForm>();
      let form: TeachingForm = 'show';
      for (let i = 0; i < 20; i++) {
        visited.add(form);
        form = getNextForm(form, true);
      }
      expect(visited.size).toBe(TEACHING_FORMS.length);
    });
  });

  describe('getNumericForm', () => {
    it('returns a unique number for every form', () => {
      const values = TEACHING_FORMS.map(getNumericForm);
      expect(new Set(values).size).toBe(TEACHING_FORMS.length);
    });

    it('returns a finite number for every form', () => {
      for (const form of TEACHING_FORMS) {
        const value = getNumericForm(form);
        expect(typeof value).toBe('number');
        expect(Number.isFinite(value)).toBe(true);
      }
    });

    it('values are in ascending order matching progression', () => {
      const progression: TeachingForm[] = [
        'show',
        'choose_4_word',
        'choose_4_def',
        'write_mid',
        'choose_8_def',
        'write',
        'write_last',
      ];
      for (let i = 1; i < progression.length; i++) {
        expect(getNumericForm(progression[i])).toBeGreaterThan(
          getNumericForm(progression[i - 1]),
        );
      }
    });
  });

  describe('getProgressInPercents', () => {
    it('returns 0 for show', () => {
      expect(getProgressInPercents('show')).toBe(0);
    });

    it('returns values in ascending order matching progression', () => {
      const progression: TeachingForm[] = [
        'show',
        'choose_4_word',
        'choose_4_def',
        'write_mid',
        'choose_8_def',
        'write',
        'write_last',
      ];
      for (let i = 1; i < progression.length; i++) {
        expect(getProgressInPercents(progression[i])).toBeGreaterThan(
          getProgressInPercents(progression[i - 1]),
        );
      }
    });

    it('never exceeds 100', () => {
      for (const form of TEACHING_FORMS) {
        expect(getProgressInPercents(form)).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('FORM_CORRECT_ANSWER', () => {
    it('covers all teaching forms', () => {
      for (const form of TEACHING_FORMS) {
        expect(form in FORM_CORRECT_ANSWER).toBe(true);
      }
    });

    it('show has no answer target', () => {
      expect(FORM_CORRECT_ANSWER.show).toBeNull();
    });

    it('all non-show forms have an answer target', () => {
      for (const form of TEACHING_FORMS) {
        if (form === 'show') continue;
        expect(FORM_CORRECT_ANSWER[form]).toMatch(/^(word|definition)$/);
      }
    });
  });

  // ── increaseMemLevel ────────────────────────────────────────────────
  describe('increaseMemLevel', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('increments by 1 for levels below the threshold', () => {
      const threshold = TeachingFormCount * 2;
      for (let level = 0; level < threshold; level++) {
        expect(increaseMemLevel(level)).toBe(level + 1);
      }
    });

    it('applies random growth factor at and above the threshold', () => {
      const threshold = TeachingFormCount * 2;
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const factor =
        0.5 * (SUCCESS_INCREASE_MAX - SUCCESS_INCREASE_MIN) + SUCCESS_INCREASE_MIN;
      const expected = Math.min(1 + Math.ceil(threshold * factor), MAX_MEM_LEVEL);
      expect(increaseMemLevel(threshold)).toBe(expected);
    });

    it('uses minimum growth factor when random returns 0', () => {
      const threshold = TeachingFormCount * 2;
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const expected = 1 + Math.ceil(threshold * SUCCESS_INCREASE_MIN);
      expect(increaseMemLevel(threshold)).toBe(expected);
    });

    it('uses maximum growth factor when random returns ~1', () => {
      const threshold = TeachingFormCount * 2;
      vi.spyOn(Math, 'random').mockReturnValue(0.9999);
      const factor =
        0.9999 * (SUCCESS_INCREASE_MAX - SUCCESS_INCREASE_MIN) + SUCCESS_INCREASE_MIN;
      const expected = Math.min(1 + Math.ceil(threshold * factor), MAX_MEM_LEVEL);
      expect(increaseMemLevel(threshold)).toBe(expected);
    });

    it('never exceeds MAX_MEM_LEVEL', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9999);
      expect(increaseMemLevel(MAX_MEM_LEVEL)).toBeLessThanOrEqual(MAX_MEM_LEVEL);
      expect(increaseMemLevel(MAX_MEM_LEVEL - 1)).toBeLessThanOrEqual(MAX_MEM_LEVEL);
    });

    it('returns at most MAX_MEM_LEVEL even for very large inputs', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1);
      expect(increaseMemLevel(9999)).toBe(MAX_MEM_LEVEL);
    });

    it('always returns a value greater than the input for small levels', () => {
      for (let level = 0; level < TeachingFormCount * 2; level++) {
        expect(increaseMemLevel(level)).toBeGreaterThan(level);
      }
    });
  });

  // ── decreaseMemLevel ────────────────────────────────────────────────
  describe('decreaseMemLevel', () => {
    it('returns 1 when isShortenOnly is false (full penalty)', () => {
      expect(decreaseMemLevel(5, false)).toBe(1);
      expect(decreaseMemLevel(100, false)).toBe(1);
      expect(decreaseMemLevel(1, false)).toBe(1);
    });

    it('returns floor(level * REPEAT_SOONER_FACTOR) when isShortenOnly and result <= 8', () => {
      const level = 10;
      const expected = Math.floor(level * REPEAT_SOONER_FACTOR); // 10 * 0.5 = 5
      expect(decreaseMemLevel(level, true)).toBe(expected);
    });

    it('caps at 8 when isShortenOnly and level * factor > 8', () => {
      const level = 20;
      const uncapped = level * REPEAT_SOONER_FACTOR; // 20 * 0.5 = 10
      expect(uncapped).toBeGreaterThan(8);
      expect(decreaseMemLevel(level, true)).toBe(8);
    });

    it('returns an integer for odd levels when isShortenOnly', () => {
      // 3 * 0.5 = 1.5 → floor → 1
      expect(decreaseMemLevel(3, true)).toBe(1);
      expect(Number.isInteger(decreaseMemLevel(3, true))).toBe(true);
    });

    it('returns level * factor when isShortenOnly and level is small', () => {
      expect(decreaseMemLevel(2, true)).toBe(Math.floor(2 * REPEAT_SOONER_FACTOR));
    });

    it('clamps soft decrease to at least 1 so memLevel 1 is never worse than full penalty', () => {
      // floor(1 * 0.5) = 0 without clamp; soft must not beat full mistake into learning (0)
      expect(decreaseMemLevel(1, true)).toBe(1);
      expect(decreaseMemLevel(1, true)).toBeGreaterThanOrEqual(
        decreaseMemLevel(1, false),
      );
    });

    it('leaves memLevel < 1 unchanged on soft decrease (0 sentinel and legacy fractions)', () => {
      expect(decreaseMemLevel(0, true)).toBe(0);
      expect(decreaseMemLevel(0.3, true)).toBe(0.3);
    });

    it('soft decrease is non-increasing for levels >= 1', () => {
      expect(decreaseMemLevel(1.5, true)).toBe(1);
      expect(decreaseMemLevel(1.5, true)).toBeLessThanOrEqual(1.5);
      expect(decreaseMemLevel(5, true)).toBeLessThanOrEqual(5);
    });
  });

  // ── getRepeatAgainDate ──────────────────────────────────────────────
  describe('getRepeatAgainDate', () => {
    const FROZEN_NOW = new Date('2025-06-01T12:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers({ now: FROZEN_NOW });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns a date memLevel days in the future', () => {
      const result = getRepeatAgainDate(5);
      expect(result).toEqual(new Date(FROZEN_NOW.getTime() + 5 * DAY_MS));
    });

    it('returns now for memLevel 0', () => {
      const result = getRepeatAgainDate(0);
      expect(result).toEqual(FROZEN_NOW);
    });

    it('handles fractional memLevel', () => {
      const result = getRepeatAgainDate(2.5);
      expect(result).toEqual(new Date(FROZEN_NOW.getTime() + 2.5 * DAY_MS));
    });

    it('returns a Date object', () => {
      expect(getRepeatAgainDate(1)).toBeInstanceOf(Date);
    });
  });
});
