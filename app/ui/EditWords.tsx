'use client';
import { useMemo, useState } from 'react';

import { Word } from '@/app/lib/definitions';
import { useThrottledCallback } from 'use-debounce';
import { SEARCH_DELAY_MS } from '../constants';
import { EditWordRowProps, NewWordRow, WordRow } from './EditWordRow';
import { EditWordHeader } from './EditWordHeader';
import { BatchImport } from './BatchImport';
import { SearchBar } from './SearchBar';
import { getWordSimilarity } from '../lib/utils';

export type EditWordsProps = {
  words: Word[];
  courseId: string;
  reduced?: boolean;
  onChange?: EditWordRowProps['onChange'];
  forceDbReload?: () => Promise<void>;
};

type EnrichedWord = { similarity: number; word: Word };

export function EditWords({
  words,
  courseId,
  reduced,
  onChange,
  forceDbReload,
}: Readonly<EditWordsProps>) {
  const [isEnriched, setIsEnriched] = useState(false);
  const [search, setSearch] = useState('');
  const setSearchThrottled = useThrottledCallback(setSearch, SEARCH_DELAY_MS);

  const enriched = useMemo(() => {
    if (!isEnriched) return {};
    const result: Record<string, EnrichedWord> = {};
    words.forEach((w) => {
      result[w.id] = { similarity: getWordSimilarity(words, w), word: w };
    });
    return result;
  }, [words, isEnriched]);

  const sortedWords = useMemo(() => {
    return words
      .filter((w) => w.word.includes(search) || w.definition.includes(search))
      .sort((a, b) => {
        let diff = 0;
        if (enriched[a.id] && enriched[b.id]) {
          diff = enriched[b.id].similarity - enriched[a.id].similarity;
        }

        return diff === 0 ? a.word.localeCompare(b.word) : diff;
      });
  }, [words, enriched, search]);

  const switchEnrichment = () => {
    setIsEnriched(!isEnriched);
  };

  const wordRows = useMemo(() => {
    return (
      <>
        {sortedWords.map((w) => (
          <WordRow
            word={w}
            key={w.id}
            reduced={reduced}
            onChange={onChange}
            similarity={enriched[w.id]?.similarity}
          />
        ))}
      </>
    );
  }, [sortedWords, enriched, reduced, onChange]);

  return (
    <div className="flex flex-col mr-4">
      {!reduced && (
        <SearchBar setSearch={setSearchThrottled} matches={sortedWords.length} />
      )}
      <table className="divide-y divide-gray-200 dark:divide-neutral-700">
        <EditWordHeader isEnriched={isEnriched} switchEnrichment={switchEnrichment} />
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          {wordRows}
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
