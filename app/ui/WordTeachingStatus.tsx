import { Word } from '@/app/lib/definitions';
import { getProgressInPercents } from '@/app/lib/word-transitions';

interface WordTeachingStatusProps {
  word: Word;
}

export function WordTeachingStatus({ word }: WordTeachingStatusProps) {
  return `${getProgressInPercents(word.form)}%`;
}
