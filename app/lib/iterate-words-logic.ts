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

export function computeNewMemLevel(
  word: WordWithMeta,
  isCorrect: boolean,
  options: { isLearning: boolean; isShortenOnly?: boolean },
): number {
  if (isCorrect) {
    if (options.isLearning) {
      return word.form === 'write_last' ? increaseMemLevel(word.memLevel) : word.memLevel;
    }
    return increaseMemLevel(word.memLevel);
  }
  if (!options.isLearning) {
    return decreaseMemLevel(word.memLevel, !!options.isShortenOnly);
  }
  return word.memLevel;
}

export function handleCorrect(
  state: IterateState,
  word: WordWithMeta,
  options: {
    isLearning: boolean;
    repetitionLimit: number;
    maxDistForRandom: number;
    randomFn?: () => number;
    overrideMemLevel?: number;
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

  const newMemLevel =
    options.overrideMemLevel ?? computeNewMemLevel(word, true, { isLearning });
  let newQueue: WordWithMeta[];

  if (isLearning) {
    if (repeated < repetitionLimit && word.form !== 'write_last') {
      newQueue = insertNextAtRandomPosition({
        ...word,
        form: getNextForm(word.form),
        repeated,
      });
    } else {
      newQueue = updateCurrentWord({
        ...word,
        form: getNextForm(word.form, true),
        memLevel: newMemLevel,
        repeatAgain: getRepeatAgainDate(newMemLevel),
      });
    }
  } else {
    // Test mode
    if (repeated < repetitionLimit) {
      newQueue = insertNextAtRandomPosition({
        ...word,
        form: getNextForm(word.form, true),
        memLevel: newMemLevel,
        repeatAgain: getRepeatAgainDate(word.memLevel),
        repeated,
      });
    } else {
      newQueue = updateCurrentWord({
        ...word,
        form: getNextForm(word.form, true),
        memLevel: newMemLevel,
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
    overrideMemLevel?: number;
  },
): IterateState {
  const { isLearning, isShortenOnly } = options;
  const { wordQueue, wordIdx } = state;

  const newForm: TeachingForm = 'show';
  const newMemLevel =
    options.overrideMemLevel ??
    computeNewMemLevel(word, false, { isLearning, isShortenOnly });

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

export type WordProgressPair = {
  start: Word;
  end: Word;
};

/** Last queue occurrence of every original batch word (including never-reached). */
export function gatherLastProgress(words: Word[], wordQueue: Word[]): WordProgressPair[] {
  const progress: WordProgressPair[] = [];
  for (const word of words) {
    const last = wordQueue.findLast((w) => w.id === word.id);
    if (!last) continue;
    progress.push({ start: word, end: last });
  }
  return progress;
}

/**
 * Unique words that already appear before the cursor. For each, the last
 * occurrence in the full queue — the same snapshot end-session would persist
 * for that word.
 */
export function gatherPassedProgress(wordQueue: Word[], wordIdx: number): Word[] {
  if (wordIdx <= 0) return [];

  const seenIds: string[] = [];
  const seen = new Set<string>();
  const limit = Math.min(wordIdx, wordQueue.length);
  for (let i = 0; i < limit; i++) {
    const id = wordQueue[i].id;
    if (!seen.has(id)) {
      seen.add(id);
      seenIds.push(id);
    }
  }

  return seenIds.flatMap((id) => {
    const last = wordQueue.findLast((w) => w.id === id);
    return last ? [last] : [];
  });
}
