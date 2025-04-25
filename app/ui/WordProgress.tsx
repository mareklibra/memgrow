import { Word } from '@/app/lib/definitions';
import { Progress, Typography } from '@material-tailwind/react';
import { getProgressInPercents } from '@/app/lib/word-transitions';
interface WordProgressProps {
  word: Word;
  className?: string;
}

export function WordProgress({ word }: WordProgressProps) {
  const value = getProgressInPercents(word.form);

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
