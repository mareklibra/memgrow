'use client';
import { useMemo, useState } from 'react';

import { Word, TeachingForm } from '@/app/lib/definitions';
import { useThrottledCallback } from 'use-debounce';
import { SEARCH_DELAY_MS } from '../constants';
import { EditWordRowProps, NewWordRow, WordRow } from './EditWordRow';
import { EditWordHeader } from './EditWordHeader';
import { BatchImport } from './BatchImport';
import { SearchBar } from './SearchBar';
import { getWordSimilarity } from '../lib/utils';
import { s } from '@/app/ui/styles';

export type EditWordsProps = {
  words: Word[];
  courseId: string;
  onChange?: EditWordRowProps['onChange'];
  forceDbReload?: () => Promise<void>;
};

type EnrichedWord = { similarity: number; word: Word };

import { SortColumn } from './types';

type SortDirection = 'asc' | 'desc';

export function EditWords({
  words,
  courseId,
  onChange,
  forceDbReload,
}: Readonly<EditWordsProps>) {
  const [isEnriched, setIsEnriched] = useState(false);
  const [search, setSearch] = useState('');
  const setSearchThrottled = useThrottledCallback(setSearch, SEARCH_DELAY_MS);
  const [sortColumn, setSortColumn] = useState<SortColumn>('word');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const enriched = useMemo(() => {
    if (!isEnriched) return {};
    const result: Record<string, EnrichedWord> = {};
    words.forEach((w) => {
      result[w.id] = { similarity: getWordSimilarity(words, w), word: w };
    });
    return result;
  }, [words, isEnriched]);

  const sortedWords = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;

    const compareFn = (a: Word, b: Word): number => {
      switch (sortColumn) {
        case 'similarity': {
          const sa = enriched[a.id]?.similarity ?? 0;
          const sb = enriched[b.id]?.similarity ?? 0;
          return (sb - sa) * dir || a.word.localeCompare(b.word);
        }
        case 'word':
          return a.word.localeCompare(b.word) * dir;
        case 'definition':
          return a.definition.localeCompare(b.definition) * dir;
        case 'memLevel':
          return (a.memLevel - b.memLevel) * dir;
        case 'form': {
          const formOrder: Record<TeachingForm, number> = {
            show: 0,
            choose_4_word: 1,
            choose_4_def: 2,
            write_mid: 3,
            choose_8_def: 4,
            write: 5,
            write_last: 6,
          };
          return ((formOrder[a.form] ?? 0) - (formOrder[b.form] ?? 0)) * dir;
        }
        case 'repeatAgain':
          return (
            ((a.repeatAgain?.getTime() ?? 0) - (b.repeatAgain?.getTime() ?? 0)) * dir
          );
        default:
          return 0;
      }
    };

    return words
      .filter((w) => w.word.includes(search) || w.definition.includes(search))
      .sort(compareFn);
  }, [words, enriched, search, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    if (column !== 'similarity') {
      setIsEnriched(false);
    }
  };

  const switchEnrichment = () => {
    const next = !isEnriched;
    setIsEnriched(next);
    if (next) {
      setSortColumn('similarity');
      setSortDirection('asc');
    } else if (sortColumn === 'similarity') {
      setSortColumn('word');
      setSortDirection('asc');
    }
  };

  const wordRows = useMemo(() => {
    return (
      <>
        {sortedWords.map((w) => (
          <WordRow
            word={w}
            key={w.id}
            onChange={onChange}
            similarity={enriched[w.id]?.similarity}
          />
        ))}
      </>
    );
  }, [sortedWords, enriched, onChange]);

  return (
    <div className="flex flex-col mr-4">
      <SearchBar setSearch={setSearchThrottled} matches={sortedWords.length} />
      <table className={s.tableDivider}>
        <EditWordHeader
          isEnriched={isEnriched}
          switchEnrichment={switchEnrichment}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
        <tbody className={s.tableDivider}>
          {wordRows}
          <NewWordRow key="___new___" courseId={courseId} />
        </tbody>
      </table>
      <BatchImport
        className="min-h-96"
        courseId={courseId}
        forceDbReload={forceDbReload}
      />
    </div>
  );
}
