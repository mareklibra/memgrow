"use client";

import { MouseEvent, useCallback, useState } from "react";
import isEqual from "lodash/isEqual";

import { Word } from "@/app/lib/definitions";
import { updateWord } from "@/app/lib/actions";
import { Button } from "./button";
import {
  ExclamationTriangleIcon,
  ArrowDownCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface EditWordsProps {
  words: Word[];
}

const thClass =
  "px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500";
const tdClass =
  "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200";
const inputClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500";

function WordRow({ word }: { word: Word }) {
  const [old, setOld] = useState<Word>(word);
  const [changed, setChanged] = useState<Word>(word);
  const [error, setError] = useState<string>();

  const handleSave = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault();
      const result = await updateWord(changed);
      setError(result?.message);
      if (result) {
        console.error(result);
      } else {
        setOld(changed);
      }
    },
    [changed]
  );

  const handleReset = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      setChanged(old);
    },
    [old]
  );

  return (
    <tr id={word.id}>
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
      <td className={tdClass}>
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
        <div className="flex flex-row gap-1">
          <Button disabled={isEqual(old, changed)} onClick={handleSave}>
            <ArrowDownCircleIcon className="w-5" />
          </Button>
          <Button disabled={isEqual(old, changed)} onClick={handleReset}>
            <ArrowPathIcon className="w-5" />
          </Button>
          {error && <ExclamationTriangleIcon className="text-red-500 w-8" />}
        </div>
      </td>
    </tr>
  );
}

export function EditWords({ words }: EditWordsProps) {
  return (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
      <thead>
        <tr>
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
            Action
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
        {words.map((w) => (
          <WordRow word={w} key={w.id} />
        ))}
      </tbody>
    </table>
  );
}
