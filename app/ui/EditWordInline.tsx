'use client';

import { MouseEvent, useState } from 'react';
import { Word } from '@/app/lib/definitions';
import { updateWord } from '@/app/lib/actions';
import { ArrowDownCircleIcon } from '@heroicons/react/24/outline';
import { Button } from './button';
import { s } from '@/app/ui/styles';
import { Typography } from '@/app/lib/material-tailwind-compat';

interface EditWordInlineProps {
  word: Word;
  onChange: (word: Word) => void;
}

export function EditWordInline({ word, onChange }: Readonly<EditWordInlineProps>) {
  const [changed, setChanged] = useState<Word>(word);
  const [error, setError] = useState<string>();

  const isDirty = changed.word !== word.word || changed.definition !== word.definition;
  const canSave =
    isDirty && changed.word.trim() !== '' && changed.definition.trim() !== '';

  const handleSave = async (e: MouseEvent) => {
    e.preventDefault();
    const result = await updateWord(changed);
    if (result?.message) {
      setError(result.message);
    } else {
      setError(undefined);
      onChange(changed);
    }
  };

  return (
    <div className="flex flex-col gap-2 py-2">
      {error && (
        <Typography variant="small" className="font-semibold text-danger">
          {error}
        </Typography>
      )}
      <label className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-neutral-400 shrink-0">W</span>
        <input
          type="text"
          className={`${s.input} w-full`}
          value={changed.word}
          autoCapitalize="none"
          placeholder="Word"
          onChange={(e) => setChanged({ ...changed, word: e.currentTarget.value })}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-neutral-400 shrink-0">D</span>
        <input
          type="text"
          className={`${s.input} w-full`}
          value={changed.definition}
          autoCapitalize="none"
          placeholder="Definition"
          onChange={(e) => setChanged({ ...changed, definition: e.currentTarget.value })}
        />
      </label>
      <div className="flex justify-end">
        <Button disabled={!canSave} onClick={handleSave} type="button">
          <ArrowDownCircleIcon className="w-5" />
          &nbsp;Save
        </Button>
      </div>
    </div>
  );
}
