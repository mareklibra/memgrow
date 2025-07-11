'use client';

import { MouseEvent, useCallback, useState } from 'react';
import isEqual from 'lodash/isEqual';
import clsx from 'clsx';

import { Word } from '@/app/lib/definitions';
import { addWord, deleteWord, updateWord } from '@/app/lib/actions';
import {
  ExclamationTriangleIcon,
  ArrowDownCircleIcon,
  ArrowPathIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

import { Button } from './button';
import { DeleteButton } from './DeleteButton';
import { BatchImport } from './BatchImport';
import stringSimilarity from 'string-similarity-js';
import { STRING_SIMILARITY_SUBSTRING_LENGTH } from '../constants';

export type EditWordsProps = {
  words: Word[];
  courseId: string;
  reduced?: boolean;
  onChange?: (word: Word) => void;
};

const UNUSED = '__not_used__';

const thClass =
  'px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500';
const tdClass =
  'px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200';
const tdClassFirst =
  'w-2 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200';
const inputClass =
  'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500';

const getWordSimilarity = (allWords: Word[], word: Word) =>
  allWords
    .map((candidate) =>
      word.id === candidate.id
        ? 0
        : stringSimilarity(word.word, candidate.word, STRING_SIMILARITY_SUBSTRING_LENGTH),
    )
    .sort((a, b) => b - a)?.[0];

function NewWordRow({ courseId }: Readonly<{ courseId: string }>) {
  return (
    <WordRow
      word={{
        id: UNUSED,
        courseId,
        word: '',
        definition: '',
        memLevel: 0,
        form: 'show',
        repeatAgain: new Date(Date.now()),
        isPriority: false,
      }}
    />
  );
}

function WordRow({
  word,
  reduced,
  onChange,
  similarity,
}: Readonly<{
  word: Word;
  reduced?: boolean;
  onChange?: EditWordsProps['onChange'];
  similarity?: number;
}>) {
  const [old, setOld] = useState<Word>(word);
  const [changed, setChanged] = useState<Word>(word);
  const [error, setError] = useState<string>();

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

  const canSave = !isEqual(old, changed) && changed.word && changed.definition;

  return (
    <tr id={word.id}>
      <td className={tdClassFirst}>
        {error && <ExclamationTriangleIcon className="text-red-500 w-8" />}
        {word.id === UNUSED && <PlusCircleIcon className="text-blue-500 w-8" />}
        {similarity && similarity >= 0.8 ? (
          <div>{parseFloat(similarity.toFixed(2))}</div>
        ) : (
          ''
        )}
      </td>
      <td className={tdClass}>
        <input
          type="text"
          className={inputClass}
          required
          value={changed.word}
          onChange={(e) => {
            setChanged({ ...changed, word: e.currentTarget.value });
          }}
        />
      </td>
      <td className={tdClass}>
        <input
          type="text"
          className={inputClass}
          required
          value={changed.definition}
          onChange={(e) => {
            setChanged({ ...changed, definition: e.currentTarget.value });
          }}
        />
      </td>
      <td className={clsx(tdClass, 'w-2')}>
        <input
          type="number"
          className={inputClass}
          required
          value={changed.memLevel}
          onChange={(e) => {
            setChanged({ ...changed, memLevel: Number(e.currentTarget.value) });
          }}
          disabled={reduced}
        />
      </td>
      <td className={tdClass}>{changed.form}</td>
      <td className={tdClass}>{changed.repeatAgain?.toLocaleDateString()}</td>
      <td className={tdClass}>
        <div className="flex flex-row gap-1 items-center">
          <Button disabled={!canSave} onClick={handleSave}>
            <ArrowDownCircleIcon className="w-5" />
          </Button>
          <Button disabled={isEqual(old, changed)} onClick={handleReset}>
            <ArrowPathIcon className="w-5" />
          </Button>
          {!reduced && <DeleteButton word={old} handleDelete={handleDelete} />}
        </div>
      </td>
    </tr>
  );
}

export function EditWords({
  words,
  courseId,
  reduced,
  onChange,
}: Readonly<EditWordsProps>) {
  return (
    <div className="flex flex-col">
      <table className="divide-y divide-gray-200 dark:divide-neutral-700">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col" className={thClass}>
              Word
            </th>
            <th scope="col" className={thClass}>
              Definition
            </th>
            <th scope="col" className={thClass}>
              Memory Level
            </th>
            <th scope="col" className={thClass}>
              Next Form
            </th>
            <th scope="col" className={thClass}>
              Repeat
            </th>
            <th scope="col" className={clsx(thClass, 'w-50')}>
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          {words.map((w) => (
            <WordRow
              word={w}
              key={w.id}
              reduced={reduced}
              onChange={onChange}
              similarity={getWordSimilarity(words, w)}
            />
          ))}
          {!reduced && <NewWordRow key="___new___" courseId={courseId} />}
        </tbody>
      </table>
      <BatchImport className="min-h-96" courseId={courseId} />
    </div>
  );
}
