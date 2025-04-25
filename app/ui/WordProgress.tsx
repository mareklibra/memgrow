import { TeachingFormCount, Word } from '@/app/lib/definitions';
import { getNumericForm } from '@/app/lib/word-transitions';
import { Progress, Typography } from '@material-tailwind/react';
interface WordProgressProps {
  word: Word;
  className?: string;
}

export function WordProgress({ word, className }: WordProgressProps) {
  const value = (getNumericForm(word.form) / TeachingFormCount) * 100;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-4">
        <Typography color="blue-gray" variant="h6">
          Memorized
        </Typography>
        <Typography color="blue-gray" variant="h6">
          {value}%
        </Typography>
      </div>
      <Progress value={value} size="sm" color="green" />
    </div>
  );
}
