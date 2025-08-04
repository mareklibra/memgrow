import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';

export interface WordDefinitionProps {
  definition: Word['definition'];
  className?: string;
  onClick: () => void;
}

export function WordDefinition({
  definition,
  className,
  onClick,
}: Readonly<WordDefinitionProps>) {
  return (
    <div
      id="word-definition"
      className={clsx(
        'w-full rounded-md border border-gray-200 text-lg outline-2 mb-8',
        className,
      )}
      onClick={onClick}
    >
      {definition}
    </div>
  );
}
