import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';
import Link from 'next/link';
import { Button, Spinner } from '@material-tailwind/react';
import { WordTeachingStatus } from './WordTeachingStatus';
import { UpdateWordResult } from '../lib/actions';

const thClass =
  'px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500';
const tdClass = 'px-3 py-4 text-sm font-medium text-gray-800 dark:text-neutral-200';

interface DoneStateProps {
  words: Word[];
  wordQueue: Word[];
  storeProgress: (word: Word) => Promise<UpdateWordResult>;
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
    <td className={tdClass} onClick={() => setIsDetail(!isDetail)}>
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
  const [isRetrigger, setIsRetrigger] = useState<boolean>(true);
  const courseId = words[0].courseId;

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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      /* just once*/
    ],
  );

  useEffect(() => {
    const runAsync = async () => {
      if (wordsToPersist.length > 0 && isRetrigger) {
        console.log('persisting words: ', wordsToPersist);

        const results = await Promise.all(wordsToPersist.map(storeProgress));
        console.log('results: ', results);

        const failed = results.filter((r) => r?.message);
        const failedWords = wordsToPersist.filter((w) =>
          failed.find((f) => f?.id === w.id),
        );
        if (failedWords.length > 0) {
          console.error('Failed to persist words: ', failedWords);
        }

        setIsRetrigger(false);
        setWordsToPersist(failedWords);
      }
    };
    runAsync();
  }, [wordsToPersist, isRetrigger, storeProgress]);

  return (
    <div className="flex flex-col">
      {isRetrigger && (
        <div className="w-full flex justify-center mt-10 mb-10">
          <Spinner className="h-6 w-6" />
          &nbsp;Persisting...
        </div>
      )}
      {!isRetrigger && wordsToPersist.length > 0 && (
        <div className="w-full flex justify-center mt-10">
          <Button
            variant="text"
            onClick={() => setIsRetrigger(true)}
            disabled={isRetrigger}
          >
            Failed to persist {wordsToPersist.length} words. Try again.
          </Button>
        </div>
      )}

      {wordsToPersist.length === 0 && (
        <div className="w-full flex justify-center mt-10">
          All words have been persisted.
        </div>
      )}

      {wordsToPersist.length === 0 && (
        <div className="w-full flex justify-center mt-10">
          <Link
            className=""
            href={`/${isLearning ? 'learn' : 'test'}/${courseId ?? ''}/next`}
            replace
          >
            <Button variant="outlined">{isLearning ? 'Learn' : 'Test'} more...</Button>
          </Link>
        </div>
      )}

      <table className="divide-y divide-gray-200 dark:divide-neutral-700 w-3/4">
        <thead>
          <tr>
            <th scope="col" className={thClass}>
              Word
            </th>
            <th scope="col" className={thClass}>
              Definition
            </th>
            <th scope="col" className={thClass}>
              Status
            </th>
            <th scope="col" className={thClass}>
              Next
            </th>
            <th scope="col" className={thClass}>
              Level
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          {progress.map((p) => {
            return (
              <tr id={p.start.id} key={p.start.id}>
                <td className={tdClass}>{p.start.word}</td>
                <td className={tdClass}>{p.start.definition}</td>
                <td className={clsx(tdClass, 'w-2')}>
                  <WordTeachingStatus word={p.end} />
                </td>
                <RepeatCell date={p.end.repeatAgain} />
                <td className={tdClass}>{p.end.memLevel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
