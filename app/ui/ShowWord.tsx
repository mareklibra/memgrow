import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';
import { TranslationOption, TranslationOptionState } from './TranslationOption';
import { FieldStatus } from './types';

interface ShowWordProps {
  word: Word;
  onClick: () => void;
  status: FieldStatus;
}
interface WordStaticProps {
  word: Word['definition'];
  className?: string;
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

export function ShowWord({ word, onClick, status }: Readonly<ShowWordProps>) {
  let state: TranslationOptionState = 'disabled';

  if (status === 'correct') {
    state = 'correct';
  }

  return (
    <>
      <WordStatic word={word.word} />
      <TranslationOption state={state} option={word.definition} handleClick={onClick} />
    </>
  );
}
