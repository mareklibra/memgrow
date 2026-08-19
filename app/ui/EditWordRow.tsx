'use client';

import { MouseEvent, useCallback, useState } from 'react';
import isEqual from 'lodash/isEqual';
import clsx from 'clsx';

import { Word, TEACHING_FORMS, TeachingForm } from '@/app/lib/definitions';
import { addWord, deleteWord, updateWord } from '@/app/lib/actions';
import {
  ExclamationTriangleIcon,
  ArrowDownCircleIcon,
  ArrowPathIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

import { Button } from './button';
import { Button as ButtonTailwind } from '@/app/lib/material-tailwind-compat';
import { DeleteButton } from './DeleteButton';
import { s } from '@/app/ui/styles';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { teachingFormMessageKey } from '@/app/lib/i18n/teaching-forms';
import { localeToBcp47 } from '@/app/lib/i18n';

const UNUSED = '__not_used__';

const tdFirst =
  'w-2 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200';

export type EditWordRowProps = {
  word: Word;
  onChange?: (word: Word) => void;
  similarity?: number;
  fastEntry?: boolean;
};

export function WordRow({
  word,
  onChange,
  similarity,
  fastEntry,
}: Readonly<EditWordRowProps>) {
  const [old, setOld] = useState<Word>(word);
  const [changed, setChanged] = useState<Word>(word);
  const [error, setError] = useState<string>();
  const [isSkipped, setIsSkipped] = useState<boolean>(word.isSkipped);
  const { t, locale } = useTranslation();

  const handleReset = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      setChanged(old);
    },
    [old],
  );

  const handleSave = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();

      let result;
      if (changed.id === UNUSED) {
        result = await addWord(changed);

        if (result?.id) {
          handleReset(e);
        }
      } else {
        result = await updateWord(changed);
      }

      if (result?.message) {
        console.error(result);
        setError(result?.message);
      } else {
        setOld(changed);
        if (onChange) {
          onChange(changed);
        }
      }
    },
    [changed, handleReset, onChange],
  );

  const handleRepeatAgain = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      setChanged({ ...changed, repeatAgain: new Date(Date.now()) });
    },
    [changed],
  );

  const handleDelete = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();

      const result = await deleteWord(word);

      if (result?.message) {
        console.error(result);
        setError(result?.message);
      }
    },
    [word],
  );

  const handleSkip = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();

      const wordToUpdate = { ...word, isSkipped: false };
      const result = await updateWord(wordToUpdate);

      if (result?.message) {
        console.error(result);
        setError(result?.message);
      } else {
        setIsSkipped(false);
      }
    },
    [word],
  );

  const canSave = !isEqual(old, changed) && changed.word && changed.definition;

  return (
    <tr id={word.id}>
      <td className={tdFirst}>
        {error && <ExclamationTriangleIcon className="text-danger w-8" />}
        {word.id === UNUSED && <PlusCircleIcon className="text-blue-500 w-8" />}
        {similarity !== undefined && <div>{parseFloat(similarity.toFixed(2))}</div>}
      </td>
      <td className={clsx(s.td, 'whitespace-nowrap')}>
        <input
          type="text"
          className={`${s.input} max-w-15 min-w-sm`}
          required
          autoCapitalize="none"
          value={changed.word}
          onChange={(e) => {
            setChanged({ ...changed, word: e.currentTarget.value });
          }}
        />
      </td>
      <td className={clsx(s.td, 'whitespace-nowrap')}>
        <input
          type="text"
          className={`${s.input} max-w-15 min-w-sm`}
          required
          autoCapitalize="none"
          value={changed.definition}
          onChange={(e) => {
            setChanged({ ...changed, definition: e.currentTarget.value });
          }}
        />
      </td>
      {!fastEntry && (
        <>
          <td className={clsx(s.td, 'w-2 whitespace-nowrap')}>
            <input
              type="number"
              className={`${s.input} max-w-15`}
              required
              value={changed.memLevel}
              onChange={(e) => {
                setChanged({ ...changed, memLevel: Number(e.currentTarget.value) });
              }}
            />
          </td>
          <td className={clsx(s.td, 'whitespace-nowrap')}>
            <select
              className={`${s.input}`}
              value={changed.form}
              onChange={(e) => {
                setChanged({ ...changed, form: e.currentTarget.value as TeachingForm });
              }}
            >
              {TEACHING_FORMS.map((f) => (
                <option key={f} value={f}>
                  {t(teachingFormMessageKey[f])}
                </option>
              ))}
            </select>
          </td>
          <td className={clsx(s.td, 'whitespace-nowrap')}>
            <ButtonTailwind variant="text" onClick={handleRepeatAgain}>
              {changed.repeatAgain?.toLocaleDateString(localeToBcp47(locale))}
            </ButtonTailwind>
          </td>
        </>
      )}
      <td className={clsx(s.td, 'whitespace-nowrap')}>
        <div className="flex flex-row gap-1 items-center">
          <Button disabled={!canSave} onClick={handleSave}>
            <ArrowDownCircleIcon className="w-5" />
          </Button>
          {!fastEntry && (
            <>
              {isSkipped && (
                <Button onClick={handleSkip}>{t('learn.keepLearning')}</Button>
              )}
              <Button disabled={isEqual(old, changed)} onClick={handleReset}>
                <ArrowPathIcon className="w-5" />
              </Button>
              <DeleteButton word={old} handleDelete={handleDelete} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function NewWordRow({
  courseId,
  fastEntry,
}: Readonly<{ courseId: string; fastEntry?: boolean }>) {
  return (
    <WordRow
      word={{
        id: UNUSED,
        courseId,
        word: '',
        definition: '',
        memLevel: 0,
        form: 'show',
        repeatAgain: new Date(),
        isPriority: false,
        isSkipped: false,
      }}
      fastEntry={fastEntry}
    />
  );
}
