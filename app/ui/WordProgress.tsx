import { TeachingFormCount, Word } from '@/app/lib/definitions';
import { getNumericForm } from '@/app/lib/word-transitions';

interface WordProgressProps {
  word: Word;
  className?: string;
}

export function WordProgress({ word, className }: WordProgressProps) {
  const value = getNumericForm(word.form);

  return <progress value={value} max={TeachingFormCount} className={className} />;
}
