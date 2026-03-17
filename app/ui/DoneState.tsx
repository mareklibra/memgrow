import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';
import { UpdateWordsResult } from '@/app/lib/types';
import Link from 'next/link';
import { Button, Spinner } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import { WordTeachingStatus } from './WordTeachingStatus';

interface DoneStateProps {
  words: Word[];
  wordQueue: Word[];
  storeProgress: (words: Word[]) => Promise<UpdateWordsResult>;
  isLearning?: boolean;
}

const findLast = (queue: Word[], wordId: Word['id']) =>
  queue.findLast((w) => w.id === wordId);

type ProgressType = {
  start: Word;
  end: Word;
};

function RepeatCell({ date }: Readonly<{ date: Date }>) {
  const [isDetail, setIsDetail] = useState<boolean>(false);
  return (
    <td className={s.td} onClick={() => setIsDetail(!isDetail)}>
      {isDetail ? date.toLocaleString() : date.toLocaleDateString()}
    </td>
  );
}

export function DoneState({
  words,
  wordQueue,
  storeProgress,
  isLearning,
}: Readonly<DoneStateProps>) {
  const [progress, setProgress] = useState<ProgressType[]>([]);
  const [wordsToPersist, setWordsToPersist] = useState<Word[]>([]);
  const wordsToPersistRef = useRef<Word[]>([]);
  const [isRetrigger, setIsRetrigger] = useState<boolean>(true);
  const courseId = words[0].courseId;

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
        }

        setWordsToPersist(failedWords);
        wordsToPersistRef.current = failedWords;
      } finally {
        setIsRetrigger(false);
      }
    }
  }, [storeProgress]);

  useEffect(
    () => {
      const progress: ProgressType[] = [];

      const lastWords: Word[] = [];
      words.forEach((word) => {
        const last = findLast(wordQueue, word.id);
        if (!last) return;

        // storeProgress(last);
        lastWords.push(last);
        progress.push({
          start: word,
          end: last,
        });
      });

      setProgress(progress);
      setWordsToPersist(lastWords);
      wordsToPersistRef.current = lastWords;

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
          &nbsp;Persisting...
        </div>
      )}
      {!isRetrigger && wordsToPersist.length > 0 && (
        <div className={s.centered}>
          <Button
            variant="outlined"
            onClick={() => setIsRetrigger(true)}
            disabled={isRetrigger}
          >
            Failed to persist {wordsToPersist.length} words. Try again.
          </Button>
        </div>
      )}

      {wordsToPersist.length === 0 && (
        <div className={s.centered}>All words have been persisted.</div>
      )}

      {wordsToPersist.length === 0 && (
        <div className={s.centered}>
          <Link href={`/${isLearning ? 'learn' : 'test'}/${courseId ?? ''}/next`} replace>
            <Button variant="outlined">{isLearning ? 'Learn' : 'Test'} more...</Button>
          </Link>
        </div>
      )}

      <table className={clsx(s.tableDivider, 'w-3/4')}>
        <thead>
          <tr>
            <th scope="col" className={s.th}>
              Word
            </th>
            <th scope="col" className={s.th}>
              Definition
            </th>
            <th scope="col" className={s.th}>
              Status
            </th>
            <th scope="col" className={s.th}>
              Next
            </th>
            <th scope="col" className={s.th}>
              Level
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
                <RepeatCell date={p.end.repeatAgain} />
                <td className={s.td}>{p.end.memLevel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
