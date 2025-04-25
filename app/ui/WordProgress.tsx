import { TeachingFormCount, Word } from '@/app/lib/definitions';
import { getNumericForm } from '@/app/lib/word-transitions';
import { Progress } from '@material-tailwind/react';
interface WordProgressProps {
  word: Word;
  className?: string;
}

export function WordProgress({ word, className }: WordProgressProps) {
  const value = (getNumericForm(word.form) / TeachingFormCount) * 100;

  return (
    <Progress
      value={value}
      label="Completed"
      size="sm"
      color="green"
      placeholder={undefined}
      onPointerEnterCapture={undefined}
      onPointerLeaveCapture={undefined}
    />
  );
}
