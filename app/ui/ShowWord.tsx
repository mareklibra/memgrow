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

export function WordDefinition({ definition, className }: Readonly<WordDefinitionProps>) {
  return (
    <div
      id="word-definition"
      className={clsx(
        'w-full rounded-md border border-gray-200 text-lg outline-2 mb-8',
        className,
      )}
    >
      {definition}
    </div>
  );
}

export function WordStatic({ word, className }: Readonly<WordStaticProps>) {
  return (
    <div
      id="word-static"
      className={clsx(
        'w-full rounded-md border border-blue-200 text-lg outline-2 mb-8 py-[0.7rem] pl-2 pr-2 bg-light-blue-100 text-center',
        className,
      )}
    >
      {word}
    </div>
  );
}

export function ShowWord({ word }: Readonly<ShowWordProps>) {
  return (
    <>
      <WordStatic word={word.word} />
      <WordDefinition
        definition={word.definition}
        className="py-[20px] pl-2 pr-2 text-center"
      />
    </>
  );
}
