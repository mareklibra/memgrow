import { DAY_MS } from '../constants';
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
  return level + 2;
}

export function decreaseMemLevel(
  // eslint-disable-next-line
  _: number,
): number {
  return 2;
}

export function getRepeatAgainDate(memLevel: number, current: Date): Date {
  const currentTime = current?.getTime() || Date.now();
  const result = new Date(currentTime + DAY_MS * memLevel);
  return result;
}
