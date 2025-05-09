import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Word } from '@/app/lib/definitions';
import { WordTeachingStatus } from './WordTeachingStatus';

const thClass =
  'px-3 py-3 text-start text-xs font-medium text-gray-500 uppercase dark:text-neutral-500';
const tdClass =
  'px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-neutral-200';

interface DoneStateProps {
  words: Word[];
  wordQueue: Word[];
  storeProgress: (word: Word) => void;
}

const findLast = (queue: Word[], wordId: Word['id']) =>
  queue.findLast((w) => w.id === wordId);

type ProgressType = {
  start: Word;
  end: Word;
};

export function DoneState({ words, wordQueue, storeProgress }: DoneStateProps) {
  const [progress, setProgress] = useState<ProgressType[]>([]);

  useEffect(
    () => {
      const progress: ProgressType[] = [];

      words.forEach((word) => {
        const last = findLast(wordQueue, word.id);
        if (!last) return;

        console.log('storing progress: ', last);
        storeProgress(last);
        progress.push({
          start: word,
          end: last,
        });
      });

      setProgress(progress);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      /* just once*/
    ],
  );

  return (
    <div className="flex flex-col">
      <table className="divide-y divide-gray-200 dark:divide-neutral-700">
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
                <td className={tdClass}>{p.end.memLevel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
