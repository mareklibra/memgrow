import { DAY_MS, MAX_MEM_LEVEL, SUCCESS_INCREASE } from '../constants';
import { TeachingForm, TeachingFormCount } from './definitions';

export function getNextForm(form: TeachingForm): TeachingForm {
  let newForm: TeachingForm = 'show';
  if (form === 'show') newForm = 'choose_4_word';
  if (form === 'choose_4_word') newForm = 'choose_4_def';
  if (form === 'choose_4_def') newForm = 'choose_8_def';
  if (form === 'choose_8_def') newForm = 'write';
  if (form === 'write') newForm = 'write_last';

  // Used during Test-flow only (not learning)
  if (form === 'write_last') newForm = 'choose_4_def';

  return newForm;
}

export function getNumericForm(form: TeachingForm): number {
  let value = 0;
  if (form === 'show') value = 0;
  if (form === 'choose_4_word') value = 1;
  if (form === 'choose_4_def') value = 2;
  if (form === 'choose_8_def') value = 3;
  if (form === 'write') value = 4;
  if (form === 'write_last') value = 5;
  return value;
}

export const getProgressInPercents = (form: TeachingForm) =>
  Math.round((Math.floor(getNumericForm(form)) / (TeachingFormCount + 1)) * 100);

export function increaseMemLevel(level: number): number {
  // Amount of days until retested again
  let next: number;
  if (level < TeachingFormCount * 2) {
    next = level + 1;
  } else {
    next = 1 + Math.ceil(level * SUCCESS_INCREASE);
  }
  return Math.min(next, MAX_MEM_LEVEL);
}

export function decreaseMemLevel(
  // eslint-disable-next-line
  existingMemLevel: number,
  isShortenOnly: boolean,
): number {
  if (isShortenOnly) {
    // Give time to remember the word
    return Math.min(8, existingMemLevel);
  }
  return 1;
}

export function getRepeatAgainDate(memLevel: number): Date {
  // const currentTime = current?.getTime() || Date.now();
  const currentTime = Date.now();
  const result = new Date(currentTime + DAY_MS * memLevel);
  return result;
}
