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
  const enriched: Record<string, { similarity: number; word: Word }> = {};
  words.forEach((w) => {
    enriched[w.id] = { similarity: getWordSimilarity(words, w), word: w };
  });

  const sortedWords = words.sort((a, b) => {
    const diff = enriched[b.id].similarity - enriched[a.id].similarity;
    return diff === 0 ? a.word.localeCompare(b.word) : diff;
  });

  return (
    <div className="flex flex-col">
      <table className="divide-y divide-gray-200 dark:divide-neutral-700">
        <EditWordHeader />
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          {sortedWords.map((w) => (
            <WordRow
              word={w}
              key={w.id}
              reduced={reduced}
              onChange={onChange}
              similarity={enriched[w.id].similarity}
            />
          ))}
          {!reduced && <NewWordRow key="___new___" courseId={courseId} />}
        </tbody>
      </table>
      {!reduced && (
        <BatchImport
          className="min-h-96"
          courseId={courseId}
          forceDbReload={forceDbReload}
        />
      )}
    </div>
  );
}
