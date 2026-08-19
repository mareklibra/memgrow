import type { TeachingForm } from '@/app/lib/definitions';
import type { MessageKey } from './translator';

export const teachingFormMessageKey: Record<TeachingForm, MessageKey> = {
  show: 'teachingForm.show',
  choose_4_word: 'teachingForm.choose4Word',
  choose_4_def: 'teachingForm.choose4Def',
  write_mid: 'teachingForm.writeMid',
  choose_8_def: 'teachingForm.choose8Def',
  write: 'teachingForm.write',
  write_last: 'teachingForm.writeLast',
};
