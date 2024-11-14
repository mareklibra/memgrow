import { TeachingFormCount, Word } from "@/app/lib/definitions";
import { getNumericForm } from "@/app/lib/word-transitions";

interface WordTeachingStatusProps {
  word: Word;
}

export function WordTeachingStatus({ word }: WordTeachingStatusProps) {
  const numeric = Math.floor(getNumericForm(word.form));
  const percentage = (numeric / (TeachingFormCount - 1)) * 100;
  return `${percentage}%`;
}
