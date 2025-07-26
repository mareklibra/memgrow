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
import { updateWordProgress } from '@/app/lib/actions';
import { TeachWord } from './TeachWord';
import { DoneState } from './DoneState';
import Link from 'next/link';
import { Button } from '@material-tailwind/react';
import { TypeTranslationProps } from './TypeTranslation';
import { learnBatchLimit } from '../constants';

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  isLearning?: boolean;
  title: string;
  specialKeys: TypeTranslationProps['specialKeys'];
}

export function IterateWords({
  words,
  repetitionLimit,
  isLearning,
  title,
  specialKeys,
}: Readonly<IterateWordsProps>) {
  const [wordQueue, setWordQueue] = useState<WordWithMeta[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setIsDone] = useState<boolean>(false);

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
    if (wordIdx >= wordQueue.length || wordIdx >= learnBatchLimit) {
      setIsDone(true);
    }
  }, [wordIdx, wordQueue.length]);

  const storeProgress = (word: Word) => {
    updateWordProgress(word);
  };

  const correct = (word: WordWithMeta) => {
    // Move learning forward
    const newForm = getNextForm(word.form);
    let newMemLevel = word.memLevel;
    let newRepeatAgain = word.repeatAgain;
    if (word.form !== 'show' && (!isLearning || word.form === 'write_last')) {
      // either Learning is done or in the Testing flow
      newMemLevel = increaseMemLevel(word.memLevel);
      newRepeatAgain = getRepeatAgainDate(
        word.memLevel /* use old memLevel */,
        word.repeatAgain,
      );
    }

    const repeated = word.form === 'show' ? word.repeated : word.repeated + 1;
    if (repeated < repetitionLimit) {
      const newWord: WordWithMeta = {
        ...word,
        form: newForm,
        memLevel: newMemLevel,
        repeatAgain: newRepeatAgain,
        repeated,
      };
      setWordQueue([...wordQueue, newWord]);
    } else {
      // modify existing word (should call set state)
      word.form = newForm;
      word.memLevel = newMemLevel;
      word.repeatAgain = newRepeatAgain;
    }

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
      repeatAgain: getRepeatAgainDate(newMemLevel, word.repeatAgain),
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
    (wordIdx / Math.min(wordQueue.length, learnBatchLimit)) * 100,
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
      />
    </div>
  );
}
