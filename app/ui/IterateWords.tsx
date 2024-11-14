"use client";
import { useEffect, useState } from "react";

import {
  decreaseMemLevel,
  getNextForm,
  increaseMemLevel,
} from "@/app/lib/word-transitions";
import { TeachingForm, Word, WordWithMeta } from "@/app/lib/definitions";
import { updateWordProgress } from "@/app/lib/actions";
import { TeachWord } from "./TeachWord";
import { DoneState } from "./DoneState";

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  isLearning?: boolean;
}

export function IterateWords({
  words,
  repetitionLimit,
  isLearning,
}: IterateWordsProps) {
  const [wordQueue, setWordQueue] = useState<WordWithMeta[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setDone] = useState<boolean>(false);

  useEffect(() => {
    // Initialize
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

    if (wordQueue[wordIdx] && wordQueue[wordIdx].repeated >= repetitionLimit) {
      // This is inefficient but good enough considering the scale
      setWordIdx(wordIdx + 1);
    }
  }, [repetitionLimit, wordIdx, wordQueue, wordQueue.length]);

  const storeProgress = (word: Word) => {
    updateWordProgress(word);
  };

  const correct = (word: WordWithMeta) => {
    // Move learning forward
    const newForm = getNextForm(word.form);

    let newMemLevel = word.memLevel;
    if (word.form !== "show" && (!isLearning || word.form === "write")) {
      // either Learning is done or in the Testing flow
      newMemLevel = increaseMemLevel(word.memLevel);
    }

    const newWord: WordWithMeta = {
      ...word,
      form: newForm,
      memLevel: newMemLevel,
      repeated: word.form === "show" ? word.repeated : word.repeated + 1,
    };

    setWordQueue([...wordQueue, newWord]);
    setWordIdx(wordIdx + 1);
  };

  const mistake = (word: WordWithMeta) => {
    // Move learning backward
    const newForm: TeachingForm = "show";
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
    newQueue.splice(idx + 1, 0, newWord);

    setWordQueue(newQueue);
    setWordIdx(wordIdx + 1);
  };

  if (isDone) {
    return (
      <DoneState
        words={words}
        wordQueue={wordQueue}
        storeProgress={storeProgress}
      />
    );
  }

  if (wordIdx < 0 || wordIdx >= wordQueue.length) {
    return undefined;
  }

  const word = wordQueue[wordIdx];
  console.log({ wordIdx, word, wordQueue });

  return (
    <TeachWord
      key={wordIdx}
      word={word}
      correct={correct}
      mistake={mistake}
      stepsDone={wordIdx}
      stepsTotal={wordQueue.length}
    />
  );
}
