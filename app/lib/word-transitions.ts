import {
  DAY_MS,
  MAX_MEM_LEVEL,
  REPEAT_SOONER_FACTOR,
  SUCCESS_INCREASE_MAX,
  SUCCESS_INCREASE_MIN,
} from '../constants';
import { TeachingForm, TeachingFormCount } from './definitions';

const LEARN_TRANSITIONS: Record<TeachingForm, TeachingForm> = {
  show: 'choose_4_word',
  choose_4_word: 'choose_4_def',
  choose_4_def: 'choose_8_def',
  write_mid: 'choose_8_def',
  choose_8_def: 'write',
  write: 'write_last',
  write_last: 'choose_4_def',
};

const TEST_TRANSITIONS: Record<TeachingForm, TeachingForm> = {
  ...LEARN_TRANSITIONS,
  choose_4_def: 'write_mid',
};

export function getNextForm(form: TeachingForm, isTest?: boolean): TeachingForm {
  return isTest ? TEST_TRANSITIONS[form] : LEARN_TRANSITIONS[form];
}

const FORM_ORDER: Record<TeachingForm, number> = {
  show: 0,
  choose_4_word: 1,
  choose_4_def: 2,
  write_mid: 3,
  choose_8_def: 4,
  write: 5,
  write_last: 6,
};

export function getNumericForm(form: TeachingForm): number {
  return FORM_ORDER[form];
}

export const getProgressInPercents = (form: TeachingForm) =>
  Math.round((Math.floor(getNumericForm(form)) / (TeachingFormCount + 1)) * 100);

export function increaseMemLevel(level: number): number {
  // Amount of days until retested again
  let next: number;
  if (level < TeachingFormCount * 2) {
    next = level + 1;
  } else {
    const factor =
      Math.random() * (SUCCESS_INCREASE_MAX - SUCCESS_INCREASE_MIN) +
      SUCCESS_INCREASE_MIN;
    next = 1 + Math.ceil(level * factor);
  }
  return Math.min(next, MAX_MEM_LEVEL);
}

export function decreaseMemLevel(
  existingMemLevel: number,
  isShortenOnly: boolean,
): number {
  if (isShortenOnly) {
    // Give time to remember the word
    return Math.min(8, existingMemLevel * REPEAT_SOONER_FACTOR);
  }
  return 1;
}

export function getRepeatAgainDate(memLevel: number): Date {
  // const currentTime = current?.getTime() || Date.now();
  const currentTime = Date.now();
  const result = new Date(currentTime + DAY_MS * memLevel);
  return result;
}
