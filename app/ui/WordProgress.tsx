import { Word } from '@/app/lib/definitions';
import { Progress, Typography } from '@/app/lib/material-tailwind-compat';
import { getProgressInPercents } from '@/app/lib/word-transitions';
interface WordProgressProps {
  word: Word;
}

export function WordProgress({ word }: Readonly<WordProgressProps>) {
  const value = getProgressInPercents(word.form);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <Typography color="blue-gray" variant="h6">
          Memorized
        </Typography>
        <Typography color="blue-gray" variant="h6">
          Level {word.memLevel}
        </Typography>
        <Typography color="blue-gray" variant="h6">
          {value}%
        </Typography>
      </div>
      <Progress value={value} size="sm" color="green" />
    </div>
  );
}
