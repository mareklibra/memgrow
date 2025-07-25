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
}: Readonly<ChooseTranslationProps>) {
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
      <div className="grid grid-cols-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-3/4 col-span-11 justify-self-center">
          {options.map((item) => {
            return (
              <div key={item}>
                <Button
                  key={item}
                  className={clsx('justify-center w-full h-16', {
                    'bg-green-600': status !== 'normal' && item === correctResponse,
                    'bg-red-500': status === 'mistake' && item === value,
                    'bg-gray-200': status === 'normal',
                  })}
                  onClick={(e) => {
                    e.preventDefault();
                    handleClick(item);
                  }}
                >
                  <div className="text-black">{item}</div>
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
            ?
          </Button>
        </div>
      </div>
    </>
  );
}
