"use client";
import { useEffect, useState } from "react";

import {
  decreaseMemLevel,
  getNextForm,
  increaseMemLevel,
} from "@/app/lib/word-transitions";
import { TeachingForm, Word, WordWithMeta } from "@/app/lib/definitions";
import { TeachWord } from "./TeachWord";
import { DoneState } from "./DoneState";

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  skipLevel?: boolean;
}

export function IterateWords({
  words,
  repetitionLimit,
  skipLevel,
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

  const storeProgress = (word: Word) => {
    console.info("TODO: storeProgress: ", word);
  };

  useEffect(() => {
    if (wordIdx >= wordQueue.length) {
      setDone(true);
      return;
    }
  }, [wordIdx, wordQueue.length]);

  const correct = (word: WordWithMeta) => {
    // Move learning forward
    const newForm = getNextForm(word.form);

    if (newForm !== "show" && word.repeated < repetitionLimit) {
      const newWord: WordWithMeta = {
        ...word,
        repeated: word.repeated + 1,
        form: newForm,
        memLevel: skipLevel ? word.memLevel : increaseMemLevel(word.memLevel),
      };
      setWordQueue([...wordQueue, newWord]);
    }

    setWordIdx(wordIdx + 1);
  };

  const mistake = (word: WordWithMeta) => {
    // Move learning backward
    const newForm: TeachingForm = "show";

    const newWord: WordWithMeta = {
      ...word,
      form: newForm,
      memLevel: skipLevel ? word.memLevel : decreaseMemLevel(word.memLevel),
      // keep the "repeated" property untouched
    };

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
