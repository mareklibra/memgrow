"use client";
import { useEffect, useState } from "react";

import { getNextForm } from "@/app/lib/word-transitions";
import { TeachingForm, Word } from "@/app/lib/definitions";
import { TeachWord } from "./TeachWord";
import { DoneState } from "./DoneState";

interface IterateWordsProps {
  words: Word[];
}

let counter = 0;
export function IterateWords({ words }: IterateWordsProps) {
  const [wordQueue, setWordQueue] = useState<Word[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setDone] = useState<boolean>(false);

  useEffect(() => {
    // Initialize
    if (wordQueue.length === 0) {
      console.log("Words have changed to: ", words, counter++);
      setWordQueue([...words]);
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

  const correct = (word: Word) => {
    // Move learning forward
    const newForm = getNextForm(word.form);

    if (newForm !== "show") {
      const newWord = {
        ...word,
        form: newForm,
      };
      setWordQueue([...wordQueue, newWord]);
    }

    if (wordIdx >= wordQueue.length - 1) {
      setDone(true);
      return;
    }

    setWordIdx(wordIdx + 1);
  };

  const mistake = (word: Word) => {
    // Move learning backward
    const newForm: TeachingForm = "show";

    const newWord = {
      ...word,
      form: newForm,
    };

    const idx = wordQueue.findLastIndex((item) => item.id === word.id);
    const newQueue = [...wordQueue];
    newQueue.splice(idx + 1, 0, newWord);
    setWordQueue(newQueue);

    // console.group("-- mistake");
    // console.log("wordIdx", wordIdx);
    // console.log("idx", idx);
    // console.log("wordQueue", wordQueue);
    // console.log("newQueue", newQueue);
    // console.groupEnd();

    setWordIdx(wordIdx + 1);
  };

  if (wordIdx < 0) {
    return undefined;
  }

  if (isDone) {
    return (
      <DoneState
        words={words}
        wordQueue={wordQueue}
        storeProgress={storeProgress}
      />
    );
  }

  const word = wordQueue[wordIdx];

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
