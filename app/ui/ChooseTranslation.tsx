import { useMemo, useState } from 'react';

import { shuffleArray } from '@/app/lib/utils';

import { FieldStatus } from './types';
import { WordStatic } from './ShowWord';
import { Button } from './button';
import { TranslationOption, TranslationOptionState } from './TranslationOption';
import { useMobile } from './useMobile';
import { Word } from '../lib/definitions';

interface ChooseTranslationProps {
  guessing: 'word' | 'definition';
  toGuess: string;
  correctResponse: string;
  similarWords: Word[];
  status: FieldStatus;
  onValue: (value: string, oneChanceOnly: boolean) => void;
  onRevertMistake: () => void;
}

export function ChooseTranslation({
  guessing,
  toGuess,
  correctResponse,
  onValue,
  onRevertMistake,
  status,
  similarWords,
}: Readonly<ChooseTranslationProps>) {
  const [value, setValue] = useState<string>();
  const { isMobile } = useMobile();
  const [isRevertClicked, setIsRevertClicked] = useState<boolean>(false);

  const options: { word: string; definition: string }[] = useMemo(() => {
    const array = similarWords.map((word) => ({
      word: word.word,
      definition: word.definition,
    }));
    array.push({
      word: correctResponse,
      definition: correctResponse,
    });
    shuffleArray(array);
    return array;
  }, [similarWords, correctResponse]);

  const handleClick = (value: string) => {
    setValue(value);
    onValue(value, true);
  };

  const handleRevertClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsRevertClicked(true);
    onRevertMistake();
  };

  return (
    <>
      <WordStatic word={toGuess} />

      {status === 'mistake' && !isRevertClicked && (
        <Button className="mb-4 w-full" onClick={handleRevertClick}>
          Soften Mistake
        </Button>
      )}
      <div className="grid grid-cols-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-3/4 col-span-11 justify-self-center">
          {options.map((option, index) => {
            let state: TranslationOptionState = 'normal';
            const item = guessing === 'word' ? option.word : option.definition;
            const optionTwin = guessing === 'word' ? option.definition : option.word;

            if (status !== 'normal' && option.definition === correctResponse) {
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
                optionTwin={optionTwin}
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
