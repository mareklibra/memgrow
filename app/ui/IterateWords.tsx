'use client';
import { useEffect, useState } from 'react';
import { lusitana } from '@/app/ui/fonts';

import {
  decreaseMemLevel,
  getNextForm,
  increaseMemLevel,
} from '@/app/lib/word-transitions';
import { TeachingForm, Word, WordWithMeta } from '@/app/lib/definitions';
import { updateWordProgress } from '@/app/lib/actions';
import { TeachWord } from './TeachWord';
import { DoneState } from './DoneState';
import Link from 'next/link';

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  isLearning?: boolean;
  title: string;
}

export function IterateWords({
  words,
  repetitionLimit,
  isLearning,
  title,
}: IterateWordsProps) {
  const [wordQueue, setWordQueue] = useState<WordWithMeta[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setDone] = useState<boolean>(false);

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
    if (wordIdx >= wordQueue.length) {
      setDone(true);
      return;
    }
  }, [wordIdx, wordQueue.length]);

  const storeProgress = (word: Word) => {
    updateWordProgress(word);
  };

  const correct = (word: WordWithMeta) => {
    // Move learning forward
    const newForm = getNextForm(word.form);

    let newMemLevel = word.memLevel;
    if (word.form !== 'show' && (!isLearning || word.form === 'write_last')) {
      // either Learning is done or in the Testing flow
      newMemLevel = increaseMemLevel(word.memLevel);
    }

    const repeated = word.form === 'show' ? word.repeated : word.repeated + 1;
    if (repeated < repetitionLimit) {
      const newWord: WordWithMeta = {
        ...word,
        form: newForm,
        memLevel: newMemLevel,
        repeated,
      };
      setWordQueue([...wordQueue, newWord]);
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
    const updated = [...wordQueue];
    const w = updated.find((w) => w.id === word.id);
    if (w) {
      w.word = word.word;
      w.definition = word.definition;
    }
    setWordQueue(updated);
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
      <DoneState words={words} wordQueue={wordQueue} storeProgress={storeProgress} />
    );
  }

  if (wordIdx < 0 || wordIdx >= wordQueue.length) {
    return undefined;
  }

  const word = wordQueue[wordIdx];

  return (
    <>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        {title} {words.length} words (step {wordIdx} / {wordQueue.length})
      </h1>

      <TeachWord
        key={wordIdx}
        word={word}
        onChange={onChange}
        correct={correct}
        mistake={mistake}
        stepsDone={wordIdx}
        stepsTotal={wordQueue.length}
      />
    </>
  );
}
