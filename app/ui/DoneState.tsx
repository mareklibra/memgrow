import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';
import { UpdateWordsResult } from '@/app/lib/types';
import Link from 'next/link';
import { Button, Spinner } from '@/app/lib/material-tailwind-compat';
import { fetchRemainingWordsCount } from '@/app/lib/actions';
import {
  savePendingBatch,
  clearPendingBatch,
  getBatchKey,
} from '@/app/lib/pending-batch';
import { gatherLastProgress, type WordProgressPair } from '@/app/lib/iterate-words-logic';
import { s } from '@/app/ui/styles';
import { WordTeachingStatus } from './WordTeachingStatus';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { localeToBcp47 } from '@/app/lib/i18n';

interface DoneStateProps {
  words: Word[];
  wordQueue: Word[];
  storeProgress: (words: Word[]) => Promise<UpdateWordsResult>;
  isLearning?: boolean;
}

function RepeatCell({
  date,
  onChange,
}: Readonly<{ date: Date; onChange: (d: Date) => void }>) {
  const [isEditing, setIsEditing] = useState(false);
  const { locale } = useTranslation();

  const toInputValue = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  if (isEditing) {
    return (
      <td className={s.td}>
        <input
          type="datetime-local"
          defaultValue={toInputValue(date)}
          autoFocus
          className="text-sm border rounded px-1"
          onBlur={(e) => {
            const d = new Date(e.target.value);
            if (!isNaN(d.getTime())) onChange(d);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
      </td>
    );
  }

  return (
    <td className={clsx(s.td, 'cursor-pointer')} onClick={() => setIsEditing(true)}>
      {date.toLocaleDateString(localeToBcp47(locale))}
    </td>
  );
}

function MemLevelCell({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (v: number) => void }>) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <td className={s.td}>
        <input
          type="number"
          defaultValue={value}
          min={0}
          autoFocus
          className="text-sm border rounded px-1 w-16"
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= 0) onChange(v);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setIsEditing(false);
          }}
        />
      </td>
    );
  }

  return (
    <td className={clsx(s.td, 'cursor-pointer')} onClick={() => setIsEditing(true)}>
      {value}
    </td>
  );
}

export function DoneState({
  words,
  wordQueue,
  storeProgress,
  isLearning,
}: Readonly<DoneStateProps>) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<WordProgressPair[]>([]);
  const [wordsToPersist, setWordsToPersist] = useState<Word[]>([]);
  const wordsToPersistRef = useRef<Word[]>([]);
  const [isRetrigger, setIsRetrigger] = useState<boolean>(true);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localStorageError, setLocalStorageError] = useState<string | null>(null);
  const courseId = words[0].courseId;

  const batchKey = courseId ? getBatchKey(courseId, !!isLearning) : '';

  const doSavePendingBatch = useCallback(
    (words: Word[]) => {
      const ok = savePendingBatch({
        words,
        courseId: courseId ?? '',
        isLearning: !!isLearning,
        timestamp: Date.now(),
      });
      setLocalStorageError(ok ? null : t('errors.localStorageSave'));
    },
    [courseId, isLearning, t],
  );

  const doPersist = useCallback(async () => {
    if (wordsToPersistRef.current.length > 0) {
      console.log('Persisting words: ', wordsToPersistRef.current);

      try {
        const result = await storeProgress(wordsToPersistRef.current);

        const failedWords: Word[] = [];
        if (result?.failedWordIds?.length && result.failedWordIds.length > 0) {
          failedWords.push(
            ...wordsToPersistRef.current.filter((w) =>
              result.failedWordIds?.includes(w.id),
            ),
          );
        }

        if (failedWords.length > 0) {
          console.error('Failed to persist words: ', failedWords);
          doSavePendingBatch(failedWords);
        }

        setWordsToPersist(failedWords);
        wordsToPersistRef.current = failedWords;

        if (failedWords.length === 0) {
          clearPendingBatch(batchKey);
          setLocalStorageError(null);
          setHasUnsavedChanges(false);
          if (courseId) {
            fetchRemainingWordsCount(courseId, !!isLearning).then(setRemainingCount);
          }
        }
      } finally {
        setIsRetrigger(false);
      }
    }
  }, [storeProgress, courseId, isLearning, batchKey, doSavePendingBatch]);

  const updateWordField = useCallback(
    (wordId: string, updates: Partial<Pick<Word, 'repeatAgain' | 'memLevel'>>) => {
      setProgress((prev) => {
        const updated = prev.map((p) =>
          p.end.id === wordId ? { ...p, end: { ...p.end, ...updates } } : p,
        );
        const wordsToSave = updated.map((p) => p.end);
        setWordsToPersist(wordsToSave);
        wordsToPersistRef.current = wordsToSave;
        return updated;
      });
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    setIsRetrigger(true);
  }, []);

  useEffect(
    () => {
      const progress = gatherLastProgress(words, wordQueue);
      const lastWords = progress.map((p) => p.end);

      setProgress(progress);
      setWordsToPersist(lastWords);
      wordsToPersistRef.current = lastWords;

      if (lastWords.length > 0 && courseId) {
        doSavePendingBatch(lastWords);
      }

      return () => {
        console.log('Leaving the DoneState: ', {
          words,
          wordQueue,
          isLearning,
          progress,
          wordsToPersist,
        });
        doPersist();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      /* just once*/
    ],
  );

  useEffect(() => {
    if (isRetrigger) {
      doPersist();
    }
  }, [isRetrigger, doPersist]);

  return (
    <div className="flex flex-col">
      {isRetrigger && (
        <div className={clsx(s.centered, 'mb-10')}>
          <Spinner className="h-6 w-6" />
          &nbsp;{t('learn.persist')}
        </div>
      )}
      {localStorageError && (
        <div className="mx-auto mt-2 max-w-xl rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {localStorageError}
        </div>
      )}
      {!isRetrigger && wordsToPersist.length > 0 && !hasUnsavedChanges && (
        <div className={s.centered}>
          <Button
            variant="outlined"
            onClick={() => setIsRetrigger(true)}
            disabled={isRetrigger}
          >
            {t('learn.persistFailed', { count: wordsToPersist.length })}
          </Button>
        </div>
      )}

      {!isRetrigger && hasUnsavedChanges && (
        <div className={s.centered}>
          <Button variant="outlined" onClick={handleSave}>
            {t('learn.saveChanges')}
          </Button>
        </div>
      )}

      {wordsToPersist.length === 0 && !hasUnsavedChanges && (
        <div className={s.centered}>{t('learn.allPersisted')}</div>
      )}

      {wordsToPersist.length === 0 && !hasUnsavedChanges && (
        <div className={s.centered}>
          <Link href={`/${isLearning ? 'learn' : 'test'}/${courseId ?? ''}/next`} replace>
            <Button variant="outlined">
              {remainingCount !== null
                ? t('learn.moreWithCount', {
                    mode: isLearning ? t('learn.title') : t('test.title'),
                    count: remainingCount,
                  })
                : t('learn.more', {
                    mode: isLearning ? t('learn.title') : t('test.title'),
                  })}
            </Button>
          </Link>
        </div>
      )}

      <table className={clsx(s.tableDivider, 'w-3/4')}>
        <thead>
          <tr>
            <th scope="col" className={s.th}>
              {t('edit.word')}
            </th>
            <th scope="col" className={s.th}>
              {t('edit.definition')}
            </th>
            <th scope="col" className={s.th}>
              {t('edit.status')}
            </th>
            <th scope="col" className={s.th}>
              {t('common.next')}
            </th>
            <th scope="col" className={s.th}>
              {t('learn.level')}
            </th>
          </tr>
        </thead>
        <tbody className={s.tableDivider}>
          {progress.map((p) => {
            console.log('Progress: ', p);
            const isSkipped = p.end.isSkipped;
            return (
              <tr
                id={p.start.id}
                key={p.start.id}
                className={isSkipped ? 'line-through' : ''}
              >
                <td className={s.td}>{p.start.word}</td>
                <td className={s.td}>{p.start.definition}</td>
                <td className={clsx(s.td, 'w-2')}>
                  <WordTeachingStatus word={p.end} />
                </td>
                <RepeatCell
                  date={p.end.repeatAgain}
                  onChange={(d) => updateWordField(p.end.id, { repeatAgain: d })}
                />
                <MemLevelCell
                  value={p.end.memLevel}
                  onChange={(v) => updateWordField(p.end.id, { memLevel: v })}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
