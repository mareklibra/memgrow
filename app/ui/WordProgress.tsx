import { TeachingFormCount, Word } from "../lib/definitions";

interface WordProgressProps {
  word: Word;
  className?: string;
}

export function WordProgress({ word, className }: WordProgressProps) {
  let value = 0;
  if (word.form === "show") value = 0.1;
  if (word.form === "choose_4") value = 1;
  if (word.form === "choose_8") value = 2;
  if (word.form === "write") value = 3;

  return (
    <progress value={value} max={TeachingFormCount} className={className} />
  );
}
