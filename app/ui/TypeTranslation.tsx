import { useState, MouseEvent, KeyboardEvent, useRef } from 'react';

import { s, cn } from '@/app/ui/styles';
import { Word } from '@/app/lib/definitions';
import { longestCommonPrefix } from '@/app/lib/utils';
import { Button as ButtonTW } from '@/app/lib/material-tailwind-compat';

import { WordStatic } from './ShowWord';
import { Button } from './button';
import { FieldStatus } from './types';
import { WordDefinition } from './WordDefinition';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

export interface TypeTranslationProps {
  word: Word;
  status: FieldStatus;
  specialKeys: string[];
  guessing?: 'word' | 'definition';
  onValue: (value: string, oneChanceOnly: boolean) => void;
}

export function TypeTranslation({
  word,
  onValue,
  status,
  specialKeys,
  guessing = 'word',
}: Readonly<TypeTranslationProps>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>('');

  const toGuess = guessing === 'definition' ? word.word : word.definition;
  const correctResponse = guessing === 'definition' ? word.definition : word.word;

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onValue(newValue, false);
  };

  const focusInputbox = () => {
    if (inputRef.current) inputRef.current.focus();
  };

  const applyHint = () => {
    if (value === correctResponse) return;
    const prefix = longestCommonPrefix(correctResponse, value);
    handleChange(prefix + correctResponse[prefix.length]);
    focusInputbox();
  };

  const handleHint = (e: MouseEvent) => {
    e.preventDefault();
    applyHint();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      applyHint();
    }
  };

  const getHandleKey = (key: string) => {
    return (e: MouseEvent) => {
      e.preventDefault();
      handleChange(`${value}${key}`);
      focusInputbox();
    };
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
          {t('common.hint')}
        </Button>

        <input
          className={cn(
            s.inputSimple,
            status === 'correct' && 'bg-success',
            status === 'mistake' && 'bg-danger',
          )}
          id="word-input"
          type="text"
          ref={inputRef}
          value={value}
          placeholder={t('learn.enterTranslation')}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={status !== 'normal'}
          required
          autoCapitalize="none"
        />
        {status === 'mistake' && (
          <WordDefinition
            definition={correctResponse}
            className="bg-success py-input-y pl-10 mt-4"
            onClick={() => {}}
          />
        )}
      </div>

      <div className="w-full mt-4">
        <div className="flex justify-center flex-wrap gap-4">
          {specialKeys.map((key) => (
            <ButtonTW key={key} variant="outlined" onClick={getHandleKey(key)}>
              {key}
            </ButtonTW>
          ))}
        </div>
      </div>
    </>
  );
}
