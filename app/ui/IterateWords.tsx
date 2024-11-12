"use client";
import { useCallback, useEffect, useState } from "react";
import { Word } from "@/app/lib/definitions";
import { TeachWord } from "./TeachWord";

interface IterateWordsProps {
  words: Word[];
}

export function IterateWords({ words }: IterateWordsProps) {
  const [wordIdx, setWordIdx] = useState<number | undefined>();
  const [isDone, setDone] = useState<boolean>(false);

  useEffect(() => {
    // Initialize
    console.log("Words have changed to: ", words);
    if (words?.length > 0) {
      setWordIdx(0);
    } else {
      setWordIdx(undefined);
    }
  }, [words]);

  const nextWord = useCallback(() => {
    // Move to the next one
    if (wordIdx === undefined) {
      throw new Error(
        "Word list must be initialized before calling nextWord()"
      );
    }
    if (wordIdx >= words.length - 1) {
      setDone(true);
      return;
    }

    setWordIdx(wordIdx + 1);
  }, [wordIdx, words]);

  const storeProgress = useCallback(() => {
    console.log("TODO: storeProgress: ", wordIdx);
  }, [wordIdx]);

  if (wordIdx === undefined) {
    return undefined;
  }

  if (isDone) {
    return <div>TODO: Done state</div>;
  }

  return (
    <TeachWord
      word={words[wordIdx]}
      nextWord={nextWord}
      storeProgress={storeProgress}
    />
  );
}
