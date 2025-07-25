'use client';

import { Word } from '@/app/lib/definitions';
import stringSimilarity from 'string-similarity-js';
import { STRING_SIMILARITY_SUBSTRING_LENGTH } from '../constants';
import { EditWordRowProps, NewWordRow, WordRow } from './EditWordRow';
import { EditWordHeader } from './EditWordHeader';
import { BatchImport } from './BatchImport';

export type EditWordsProps = {
  words: Word[];
  courseId: string;
  reduced?: boolean;
  onChange?: EditWordRowProps['onChange'];
  forceDbReload?: () => Promise<void>;
};

const getWordSimilarity = (allWords: Word[], word: Word) =>
  allWords
    .map((candidate) =>
      word.id === candidate.id
        ? 0
        : stringSimilarity(word.word, candidate.word, STRING_SIMILARITY_SUBSTRING_LENGTH),
    )
    .sort((a, b) => b - a)?.[0];

export function EditWords({
  words,
  courseId,
  reduced,
  onChange,
  forceDbReload,
}: Readonly<EditWordsProps>) {
  return (
    <div className="flex flex-col">
      <table className="divide-y divide-gray-200 dark:divide-neutral-700">
        <EditWordHeader />
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
      <BatchImport className="min-h-96" courseId={courseId} forceDbReload={forceDbReload} />
    </div>
  );
}
