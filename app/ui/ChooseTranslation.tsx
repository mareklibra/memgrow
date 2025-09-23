import { useMemo, useState } from 'react';

import { shuffleArray } from '@/app/lib/utils';

import { FieldStatus } from './types';
import { WordStatic } from './ShowWord';
import { Button } from './button';
import { TranslationOption, TranslationOptionState } from './TranslationOption';
import { useMobile } from './useMobile';

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
  const { isMobile } = useMobile();
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
          {options.map((item, index) => {
            let state: TranslationOptionState = 'normal';
            if (status !== 'normal' && item === correctResponse) {
              state = 'correct';
            } else if (status === 'mistake' && item === value) {
              state = 'mistake';
            } else if (status === 'normal') {
              state = 'disabled';
            }

            return (
              <TranslationOption
                state={state}
                shortcut={isMobile ? undefined : (index + 1).toString()}
                option={item}
                handleClick={handleClick}
                key={item}
              />
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
