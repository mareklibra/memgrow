import { TeachingForm } from './definitions';

export type CorrectAnswerTarget = 'word' | 'definition';

/**
 * Maps each teaching form to the field the user must supply to answer correctly.
 * `null` means the form has no typed/chosen answer (e.g. "show").
 *
 * Using Record<TeachingForm, …> guarantees a compile error when a new form is
 * added to TeachingForm but not handled here.
 */
export const FORM_CORRECT_ANSWER: Record<TeachingForm, CorrectAnswerTarget | null> = {
  show: null,
  choose_4_word: 'word',
  choose_4_def: 'definition',
  choose_8_def: 'definition',
  write_mid: 'word',
  write: 'word',
  write_last: 'word',
};
