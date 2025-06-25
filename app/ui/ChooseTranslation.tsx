import { useMemo, useState } from 'react';
import clsx from 'clsx';

import { shuffleArray } from '@/app/lib/utils';

import { FieldStatus } from './types';
import { WordStatic } from './ShowWord';
import { Button } from './button';

interface ChooseTranslationProps {
  // word: Word;
  toGuess: string;
  correctResponse: string;
  status: FieldStatus;
  onValue: (value: string, oneChanceOnly: boolean) => void;
  otherOptions: string[];
}

export function ChooseTranslation({
  toGuess,
  correctResponse,
  onValue,
  status,
  otherOptions,
}: ChooseTranslationProps) {
  const [value, setValue] = useState<string>();
  const options = useMemo(() => {
    const array = [...otherOptions, correctResponse];
    shuffleArray(array);
    return array;
  }, [otherOptions, correctResponse]);

  const handleClick = (value: string) => {
    setValue(value);
    onValue(value, true);
  };

  return (
    <>
      <WordStatic word={toGuess} />
      <div className="grid grid-cols-12 w-100">
        <div className="grid grid-cols-2 gap-6 w-3/4 col-span-11 justify-self-center">
          {options.map((item) => {
            return (
              <div key={item} className="">
                <Button
                  key={item}
                  className={clsx('justify-center w-full', {
                    'bg-green-600': status !== 'normal' && item === correctResponse,
                    'bg-red-500': status === 'mistake' && item === value,
                    'bg-gray-500': status === 'normal',
                  })}
                  onClick={(e) => {
                    e.preventDefault();
                    handleClick(item);
                  }}
                >
                  {item}
                </Button>
              </div>
            );
          })}
        </div>

        <div>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleClick('');
            }}
          >
            Do not know
          </Button>
        </div>
      </div>
    </>
  );
}
