'use client';
import { useEffect, useState } from 'react';
import { lusitana } from '@/app/ui/fonts';

import {
  decreaseMemLevel,
  getNextForm,
  getRepeatAgainDate,
  increaseMemLevel,
} from '@/app/lib/word-transitions';
import { TeachingForm, Word, WordWithMeta } from '@/app/lib/definitions';
import { updateWordProgress, UpdateWordResult } from '@/app/lib/actions';
import { TeachWord } from './TeachWord';
import { DoneState } from './DoneState';
import Link from 'next/link';
import { Button } from '@material-tailwind/react';
import { TypeTranslationProps } from './TypeTranslation';
import {
  learnBatchLimit,
  learnBatchLimitOffline,
  maxDistanceForRandomQueueInsertion,
} from '../constants';

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  isLearning?: boolean;
  title: string;
  specialKeys: TypeTranslationProps['specialKeys'];
  isOffline: boolean;
}

const storeProgress = async (word: Word): Promise<UpdateWordResult> => {
  try {
    return await updateWordProgress(word);
  } catch (error) {
    console.error('Failed to call updateWordProgress action: ', error);
    return { message: 'Failed to call updateWordProgress action', id: word.id };
  }
};

export function IterateWords({
  words,
  repetitionLimit,
  isLearning,
  title,
  specialKeys,
  isOffline,
}: Readonly<IterateWordsProps>) {
  const [wordQueue, setWordQueue] = useState<WordWithMeta[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setIsDone] = useState<boolean>(false);

  const maxWordsInBatch = isOffline ? learnBatchLimitOffline : learnBatchLimit;

  useEffect(
    () => {
      window.onbeforeunload = confirmExit;
      function confirmExit() {
        return 'By closing this page you will lose your progress.';
      }
    },
    [
      /* just once*/
    ],
  );

  useEffect(() => {
    // Initialize
    if (words.length === 0) {
      return;
    }

    if (wordQueue.length === 0) {
      setWordQueue(words.map((w) => ({ ...w, repeated: 0 })));

      if (words?.length > 0) {
        setWordIdx(0);
      } else {
        setWordIdx(-1);
      }
    }
  }, [words, wordQueue]);

  useEffect(() => {
    if (wordIdx >= wordQueue.length || wordIdx >= maxWordsInBatch) {
      setIsDone(true);
    }
  }, [wordIdx, wordQueue.length]);

  const correct = (word: WordWithMeta) => {
    // learning show
    // learning progress
    // learning last
    // test
    const repeated = word.form === 'show' ? word.repeated : word.repeated + 1;

    const insertNextAtRandomPosition = (w: WordWithMeta) => {
      const randomIdx = Math.min(
        2 + wordIdx + Math.floor(Math.random() * (wordQueue.length - wordIdx)),
        wordIdx + maxDistanceForRandomQueueInsertion,
      );
      const oldQueue = wordQueue.slice(0, randomIdx);
      const newQueue = wordQueue.slice(randomIdx);
      setWordQueue([...oldQueue, w, ...newQueue]);
    };

    const updateCurrentWord = (w: WordWithMeta) => {
      const newQueue = [...wordQueue];
      newQueue[wordIdx] = w;
      setWordQueue(newQueue);
    };

    if (isLearning) {
      if (repeated < repetitionLimit && word.form !== 'write_last') {
        insertNextAtRandomPosition({
          ...word,
          form: getNextForm(word.form),
          repeated,
        });
      } else {
        const newMemLevel =
          word.form === 'write_last' ? increaseMemLevel(word.memLevel) : word.memLevel;
        updateCurrentWord({
          ...word,
          form: getNextForm(word.form),
          memLevel: newMemLevel,
          repeatAgain: getRepeatAgainDate(newMemLevel),
        });
      }
    } else {
      // Test
      if (repeated < repetitionLimit) {
        insertNextAtRandomPosition({
          ...word,
          form: getNextForm(word.form),
          memLevel: increaseMemLevel(word.memLevel),
          repeatAgain: getRepeatAgainDate(word.memLevel),
          repeated,
        });
      } else {
        updateCurrentWord({
          ...word,
          form: getNextForm(word.form),
          memLevel: increaseMemLevel(word.memLevel),
          repeatAgain: getRepeatAgainDate(word.memLevel),
        });
      }
    }

    // Move learning forward
    setWordIdx(wordIdx + 1);
  };

  const mistake = (word: WordWithMeta) => {
    // Move learning backward
    const newForm: TeachingForm = 'show';
    let newMemLevel = word.memLevel;
    if (!isLearning) {
      newMemLevel = decreaseMemLevel(word.memLevel);
    }

    const newWord: WordWithMeta = {
      ...word,
      form: newForm,
      memLevel: newMemLevel,
      repeatAgain: getRepeatAgainDate(
        newMemLevel,
        // word.repeatAgain
      ),
      // keep the "repeated" property untouched
    };

    // insert right after recent step
    const idx = wordQueue.findLastIndex((item) => item.id === word.id);
    const newQueue = [...wordQueue];
    newQueue.splice(idx + 2, 0, newWord);

    setWordQueue(newQueue);
    setWordIdx(wordIdx + 1);
  };

  const onChange = (word: Word) => {
    const updated = wordQueue.map((w) => {
      if (w.id === word.id) {
        w.word = word.word;
        w.definition = word.definition;
        w.memLevel = word.memLevel;
        w.isPriority = word.isPriority;
      }
      return w;
    });
    setWordQueue(updated);
  };

  const onLeave = () => {
    // Subsequently, the DoneState will save the progress
    setIsDone(true);
  };

  const repeatSooner = (word: Word) => {
    onChange({ ...word, memLevel: decreaseMemLevel(word.memLevel) });
  };

  const handlePriority = (word: Word) => {
    onChange({ ...word, isPriority: !word.isPriority });
  };

  if (!words.length) {
    return (
      <div>
        Nothing more to learn. Try <Link href="/test">Test</Link>
      </div>
    );
  }

  if (isDone) {
    return (
      <DoneState
        words={words}
        wordQueue={wordQueue}
        storeProgress={storeProgress}
        isLearning={isLearning}
      />
    );
  }

  if (wordIdx < 0 || wordIdx >= wordQueue.length) {
    return undefined;
  }

  const word = wordQueue[wordIdx];

  const progress = Math.round(
    (wordIdx / Math.min(wordQueue.length, maxWordsInBatch)) * 100,
  );

  return (
    <div className="w-full p-5">
      <h1
        className={`${lusitana.className} mb-4 text-xl md:text-2xl flex justify-between`}
      >
        <div>
          {title} up to {words.length} words ({progress}% done)
        </div>
        <div>
          <Button variant="outlined" onClick={onLeave}>
            X
          </Button>
        </div>
      </h1>

      <TeachWord
        key={wordIdx}
        word={word}
        onChange={onChange}
        correct={correct}
        mistake={mistake}
        repeatSooner={repeatSooner}
        handlePriority={handlePriority}
        stepsDone={wordIdx}
        stepsTotal={wordQueue.length}
        specialKeys={specialKeys}
        isOffline={isOffline}
      />
    </div>
  );
}
