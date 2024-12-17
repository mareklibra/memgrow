import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';

interface ShowWordProps {
  word: Word;
}

interface WordDefinitionProps {
  definition: Word['definition'];
  className?: string;
}

interface WordStaticProps {
  word: Word['definition'];
  className?: string;
}

export function WordDefinition({ definition, className }: WordDefinitionProps) {
  return (
    <div
      className={clsx(
        'w-full rounded-md border border-gray-200 text-lg outline-2 mb-8',
        className,
      )}
    >
      {definition}
    </div>
  );
}

export function WordStatic({ word, className }: WordStaticProps) {
  return (
    <div
      className={clsx(
        'w-full rounded-md border border-blue-200 text-lg outline-2 mb-8 py-[20px] pl-10 bg-sky-200',
        className,
      )}
    >
      {word}
    </div>
  );
}

export function ShowWord({ word }: ShowWordProps) {
  return (
    <>
      <WordStatic word={word.word} />
      <WordDefinition definition={word.definition} className="py-[20px] pl-10" />
    </>
  );
}
