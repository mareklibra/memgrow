"use client";
import { useCallback, useEffect, useState } from "react";
import { TeachingForm, Word } from "@/app/lib/definitions";
import { TeachWord } from "./TeachWord";

interface IterateWordsProps {
  words: Word[];
}

export function IterateWords({ words }: IterateWordsProps) {
  const [wordQueue, setWordQueue] = useState<Word[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setDone] = useState<boolean>(false);

  useEffect(() => {
    // Initialize
    console.log("Words have changed to: ", words);
    setWordQueue([...words]);
    if (words?.length > 0) {
      setWordIdx(0);
    } else {
      setWordIdx(-1);
    }
  }, [words]);

  const storeProgress = useCallback(() => {
    console.info("TODO: storeProgress: ", wordIdx);
  }, [wordIdx]);

  const correct = (word: Word) => {
    // Move learning forward
    let newForm: TeachingForm = "show";
    if (word.form === "show") newForm = "choose_4";
    if (word.form === "choose_4") newForm = "choose_8";
    if (word.form === "choose_8") newForm = "write";

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

    setWordQueue([...wordQueue, newWord]);
    setWordIdx(wordIdx + 1);
    // TODO:
    //   const idx = wordQueue.findLastIndex(item => item.id === word.id);
    //   const newQueue = [...wordQueue];
    //   newQueue.splice(idx + 1, 0, newWord);
    //   setWordQueue(newQueue);
  };

  if (wordIdx < 0) {
    return undefined;
  }

  if (isDone) {
    return <div>TODO: Done state</div>;
  }

  const word = wordQueue[wordIdx];

  return (
    <TeachWord
      key={word.id}
      word={word}
      correct={correct}
      mistake={mistake}
      storeProgress={storeProgress}
      stepsDone={wordIdx}
      stepsTotal={wordQueue.length}
    />
  );
}
