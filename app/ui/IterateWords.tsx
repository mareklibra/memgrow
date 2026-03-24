'use client';
import { useCallback, useEffect, useState } from 'react';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import Link from 'next/link';
import { Button } from '@/app/lib/material-tailwind-compat';
import { decreaseMemLevel } from '@/app/lib/word-transitions';
import { Word, WordWithMeta } from '@/app/lib/definitions';
import { updateWordsProgress } from '@/app/lib/actions';
import { UpdateWordsResult } from '@/app/lib/types';
import {
  calculateProgress,
  checkIsDone,
  handleCorrect,
  handleMistake,
  handleOnChange,
  handleSkipWord,
  initializeQueue,
} from '@/app/lib/iterate-words-logic';
import { TeachWord } from './TeachWord';
import { DoneState } from './DoneState';
import { TypeTranslationProps } from './TypeTranslation';
import {
  learnBatchLimit,
  learnBatchLimitOffline,
  MAX_MEM_LEVEL,
  maxDistanceForRandomQueueInsertion,
  testBatchLimit,
  testBatchLimitOffline,
} from '../constants';
import { WordExamplesProps } from './WordExamples';
import { DonutProgressChart } from './DonutProgressChart';

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  isLearning?: boolean;
  title: string;
  specialKeys: TypeTranslationProps['specialKeys'];
  isOffline: boolean;
  queryExamples: WordExamplesProps['queryExamples'];
  deleteExample: WordExamplesProps['deleteExample'];
}

const storeProgress = async (words: Word[]): Promise<UpdateWordsResult> => {
  try {
    return await updateWordsProgress(words);
  } catch (error) {
    console.error('Failed to call updateWordsProgress action: ', error);
    return {
      message: 'Failed to call updateWordProgress action',
      failedWordIds: words.map((w) => w.id),
    };
  }
};

export function IterateWords({
  words,
  repetitionLimit,
  isLearning,
  title,
  specialKeys,
  isOffline,
  queryExamples,
  deleteExample,
}: Readonly<IterateWordsProps>) {
  const [wordQueue, setWordQueue] = useState<WordWithMeta[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setIsDone] = useState<boolean>(false);

  let maxWordsInBatch = isOffline ? testBatchLimitOffline : testBatchLimit;
  if (isLearning) {
    maxWordsInBatch = isOffline ? learnBatchLimitOffline : learnBatchLimit;
  }

  useEffect(
    () => {
      window.onbeforeunload = confirmExit;
      function confirmExit() {
        return 'By closing this page you will lose your progress.';
      }
      return () => {
        window.onbeforeunload = null;
      };
    },
    [
      /* just once*/
    ],
  );

  useEffect(() => {
    if (words.length === 0) return;

    if (wordQueue.length === 0) {
      queueMicrotask(() => {
        const initial = initializeQueue(words);
        setWordQueue(initial.wordQueue);
        setWordIdx(initial.wordIdx);
      });
    }
  }, [words, wordQueue]);

  useEffect(() => {
    if (checkIsDone(wordIdx, wordQueue.length, maxWordsInBatch)) {
      queueMicrotask(() => setIsDone(true));
    }
  }, [wordIdx, wordQueue.length, maxWordsInBatch]);

  const correct = (word: WordWithMeta) => {
    const newState = handleCorrect({ wordQueue, wordIdx }, word, {
      isLearning: !!isLearning,
      repetitionLimit,
      maxDistForRandom: maxDistanceForRandomQueueInsertion,
    });
    setWordQueue(newState.wordQueue);
    setWordIdx(newState.wordIdx);
  };

  const mistake = (word: WordWithMeta, isShortenOnly: boolean) => {
    const newState = handleMistake({ wordQueue, wordIdx }, word, {
      isLearning: !!isLearning,
      isShortenOnly,
    });
    setWordQueue(newState.wordQueue);
    setWordIdx(newState.wordIdx);
  };

  const onChange = useCallback(
    (word: Word) => {
      setWordQueue(handleOnChange(wordQueue, word));
    },
    [wordQueue],
  );

  const skipWord = useCallback(
    (word: Word) => {
      console.log('skipWord', word);
      const newState = handleSkipWord({ wordQueue, wordIdx }, word);
      setWordQueue(newState.wordQueue);
      setWordIdx(newState.wordIdx);
    },
    [wordIdx, wordQueue],
  );

  const onLeave = () => {
    // Subsequently, the DoneState will save the progress
    setIsDone(true);
  };

  const repeatSooner = (word: Word) => {
    onChange({ ...word, memLevel: decreaseMemLevel(word.memLevel, true) });
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

  const progress = calculateProgress(wordIdx, wordQueue.length, maxWordsInBatch);

  return (
    <div className="w-full p-2 md:pt-5">
      <h1 className={`${lusitana.className} ${s.pageTitle} flex justify-between`}>
        <DonutProgressChart
          label="Level"
          progress={word.memLevel}
          max={MAX_MEM_LEVEL}
          suffix=""
          width={70}
          valueSize="12px"
        />
        <div className="flex items-center">
          {title}&nbsp;{words.length} words
        </div>
        <div className="flex gap-2 items-center">
          <DonutProgressChart
            label="Batch"
            progress={progress}
            max={100}
            width={70}
            valueSize="12px"
          />
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
        queryExamples={queryExamples}
        deleteExample={deleteExample}
        skipWord={skipWord}
      />
    </div>
  );
}
