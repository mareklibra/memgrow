import { useEffect, useState } from "react";
import { Word } from "@/app/lib/definitions";
import { WordTeachingStatus } from "./WordTeachingStatus";

interface DoneStateProps {
  words: Word[];
  wordQueue: Word[];
  storeProgress: (word: Word) => void;
}

const findLast = (queue: Word[], wordId: Word["id"]) =>
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
    ]
  );
  return (
    <p>
      <div className="grid grid-cols-3">
        {progress.map((p) => {
          return (
            <>
              <div>{p.start.word}</div>
              <div>{p.start.definition}</div>
              <div>
                <WordTeachingStatus word={p.end} />
              </div>
            </>
          );
        })}
      </div>
    </p>
  );
}
