import { useState, MouseEvent, useRef } from 'react';
import clsx from 'clsx';

import { Word } from '@/app/lib/definitions';
import { longestCommonPrefix } from '@/app/lib/utils';
import { Button as ButtonTW } from '@material-tailwind/react';

import { WordDefinition, WordStatic } from './ShowWord';
import { Button } from './button';
import { FieldStatus } from './types';

export interface TypeTranslationProps {
  word: Word;
  status: FieldStatus;
  specialKeys: string[];
  onValue: (value: string, oneChanceOnly: boolean) => void;
}

export function TypeTranslation({
  word,
  onValue,
  status,
  specialKeys,
}: Readonly<TypeTranslationProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>('');

  const toGuess = word.definition;
  const correctResponse = word.word;

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onValue(newValue, false);
  };

  const focusInputbox = () => {
    if (inputRef.current) inputRef.current.focus();
  };

  const handleHint = (e: MouseEvent) => {
    e.preventDefault();
    const prefix = longestCommonPrefix(correctResponse, value);
    handleChange(prefix + correctResponse[prefix.length]);
    focusInputbox();
  };

  const getHandleKey = (key: string) => {
    return (e: MouseEvent) => {
      e.preventDefault();
      handleChange(`${value}${key}`);
      focusInputbox();
    }
  };

  return (
    <>
      <WordStatic word={toGuess} />
      <div className="flex">
        <Button
          className="mr-4"
          onClick={handleHint}
          type="submit"
          disabled={value === correctResponse}
        >
          Hint
        </Button>

        <input
          className={clsx(
            'peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500',
            {
              'bg-green-600': status === 'correct',
              'bg-red-500': status === 'mistake',
            },
          )}
          id="word-input"
          type="text"
          ref={inputRef}
          value={value}
          placeholder="Enter your translation"
          onChange={(e) => handleChange(e.currentTarget.value)}
          autoFocus
          disabled={status !== 'normal'}
          required
        />
        {status === 'mistake' && (
          <WordDefinition
            definition={correctResponse}
            className="bg-green-600 py-[9px] pl-10 mt-4"
          />
        )}
      </div>

      <div className="flex w-3/4 gap-4 mt-4">
        {specialKeys.map((key) => (
          <ButtonTW
            key={key}
            variant="outlined"
            onClick={getHandleKey(key)}
          >
            {key}
          </ButtonTW>
        ))}
      </div>
    </>
  );
}
