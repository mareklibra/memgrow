import { TeachingForm, Word, WordWithMeta } from '@/app/lib/definitions';
import {
  decreaseMemLevel,
  getNextForm,
  getRepeatAgainDate,
  increaseMemLevel,
} from '@/app/lib/word-transitions';

export type IterateState = {
  wordQueue: WordWithMeta[];
  wordIdx: number;
};

export function initializeQueue(words: Word[]): IterateState {
  return {
    wordQueue: words.map((w) => ({ ...w, repeated: 0 })),
    wordIdx: words.length > 0 ? 0 : -1,
  };
}

export function checkIsDone(
  wordIdx: number,
  queueLength: number,
  maxWordsInBatch: number,
): boolean {
  return wordIdx >= queueLength || wordIdx >= maxWordsInBatch;
}

export function calculateProgress(
  wordIdx: number,
  queueLength: number,
  maxWordsInBatch: number,
): number {
  return Math.round((wordIdx / Math.min(queueLength, maxWordsInBatch)) * 100);
}

export function handleCorrect(
  state: IterateState,
  word: WordWithMeta,
  options: {
    isLearning: boolean;
    repetitionLimit: number;
    maxDistForRandom: number;
    randomFn?: () => number;
  },
): IterateState {
  const {
    isLearning,
    repetitionLimit,
    maxDistForRandom,
    randomFn = Math.random,
  } = options;
  const { wordQueue, wordIdx } = state;

  const repeated = word.form === 'show' ? word.repeated : word.repeated + 1;

  const insertNextAtRandomPosition = (w: WordWithMeta): WordWithMeta[] => {
    const randomIdx = Math.min(
      2 + wordIdx + Math.floor(randomFn() * (wordQueue.length - wordIdx)),
      wordIdx + maxDistForRandom,
    );
    const before = wordQueue.slice(0, randomIdx);
    const after = wordQueue.slice(randomIdx);
    return [...before, w, ...after];
  };

  const updateCurrentWord = (w: WordWithMeta): WordWithMeta[] => {
    const newQueue = [...wordQueue];
    newQueue[wordIdx] = w;
    return newQueue;
  };

  let newQueue: WordWithMeta[];

  if (isLearning) {
    if (repeated < repetitionLimit && word.form !== 'write_last') {
      newQueue = insertNextAtRandomPosition({
        ...word,
        form: getNextForm(word.form),
        repeated,
      });
    } else {
      const newMemLevel =
        word.form === 'write_last' ? increaseMemLevel(word.memLevel) : word.memLevel;
      newQueue = updateCurrentWord({
        ...word,
        form: getNextForm(word.form),
        memLevel: newMemLevel,
        repeatAgain: getRepeatAgainDate(newMemLevel),
      });
    }
  } else {
    // Test mode
    if (repeated < repetitionLimit) {
      newQueue = insertNextAtRandomPosition({
        ...word,
        form: getNextForm(word.form),
        memLevel: increaseMemLevel(word.memLevel),
        repeatAgain: getRepeatAgainDate(word.memLevel),
        repeated,
      });
    } else {
      newQueue = updateCurrentWord({
        ...word,
        form: getNextForm(word.form),
        memLevel: increaseMemLevel(word.memLevel),
        repeatAgain: getRepeatAgainDate(word.memLevel),
      });
    }
  }

  return { wordQueue: newQueue, wordIdx: wordIdx + 1 };
}

export function handleMistake(
  state: IterateState,
  word: WordWithMeta,
  options: {
    isLearning: boolean;
    isShortenOnly: boolean;
  },
): IterateState {
  const { isLearning, isShortenOnly } = options;
  const { wordQueue, wordIdx } = state;

  const newForm: TeachingForm = 'show';
  let newMemLevel = word.memLevel;
  if (!isLearning) {
    newMemLevel = decreaseMemLevel(word.memLevel, isShortenOnly);
  }

  const newWord: WordWithMeta = {
    ...word,
    form: newForm,
    memLevel: newMemLevel,
    repeatAgain: getRepeatAgainDate(newMemLevel),
  };

  const idx = wordQueue.findLastIndex((item) => item.id === word.id);
  const newQueue = [...wordQueue];
  newQueue.splice(idx + 2, 0, newWord);

  return { wordQueue: newQueue, wordIdx: wordIdx + 1 };
}

export function handleSkipWord(state: IterateState, word: Word): IterateState {
  const { wordQueue, wordIdx } = state;

  const newQueue = wordQueue
    .map((w, index) => {
      if (index < wordIdx) return w;
      if (index === wordIdx) return { ...w, isSkipped: true };
      if (w.id === word.id) return undefined;
      return w;
    })
    .filter((w): w is WordWithMeta => w !== undefined);

  return { wordQueue: newQueue, wordIdx: wordIdx + 1 };
}

export function handleOnChange(wordQueue: WordWithMeta[], word: Word): WordWithMeta[] {
  return wordQueue.map((w) => {
    if (w.id === word.id) {
      return {
        ...w,
        word: word.word,
        definition: word.definition,
        memLevel: word.memLevel,
        isPriority: word.isPriority,
      };
    }
    return w;
  });
}
