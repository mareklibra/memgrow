'use client';

import { MouseEvent, useCallback, useState } from 'react';
import isEqual from 'lodash/isEqual';

import { Word } from '@/app/lib/definitions';
import { addWord, deleteWord, updateWord } from '@/app/lib/actions';
import {
  ExclamationTriangleIcon,
  ArrowDownCircleIcon,
  ArrowPathIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

import { Button } from './button';
import clsx from 'clsx';
import { DeleteButton } from './DeleteButton';

type EditWordsProps = {
  words: Word[];
  courseId: string;
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

function NewWordRow({ courseId }: { courseId: string }) {
  return (
    <WordRow
      word={{
        id: UNUSED,
        courseId,
        word: '',
        definition: '',
        memLevel: 0,
        form: 'show',
      }}
    />
  );
}

function WordRow({ word }: { word: Word }) {
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
      }
    },
    [changed, handleReset],
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
        />
      </td>
      <td className={tdClass}>{changed.form}</td>
      <td className={tdClass}>
        <div className="flex flex-row gap-1 items-center">
          <Button disabled={!canSave} onClick={handleSave}>
            <ArrowDownCircleIcon className="w-5" />
          </Button>
          <Button disabled={isEqual(old, changed)} onClick={handleReset}>
            <ArrowPathIcon className="w-5" />
          </Button>
          <DeleteButton word={old} handleDelete={handleDelete} />
        </div>
      </td>
    </tr>
  );
}

export function EditWords({ words, courseId }: EditWordsProps) {
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
            <th scope="col" className={clsx(thClass, 'w-50')}>
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          {words.map((w) => (
            <WordRow word={w} key={w.id} />
          ))}
          <NewWordRow key="___new___" courseId={courseId} />
        </tbody>
      </table>
    </div>
  );
}
