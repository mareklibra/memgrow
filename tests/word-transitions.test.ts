import { describe, it, expect } from 'vitest';
import { TEACHING_FORMS, TeachingForm, TeachingFormCount } from '@/app/lib/definitions';
import {
  getNextForm,
  getNumericForm,
  getProgressInPercents,
} from '@/app/lib/word-transitions';
import { FORM_CORRECT_ANSWER } from '@/app/lib/form-config';

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
});
