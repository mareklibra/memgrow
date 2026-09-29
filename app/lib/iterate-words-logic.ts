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

export type PictureProbe = { id: string; imageId: string };

export type SessionProbePlan = {
  picture: PictureProbe[];
  previousIds: string[];
};

function shuffle<T>(items: T[], randomFn: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const current = copy[i];
    copy[i] = copy[j];
    copy[j] = current;
  }
  return copy;
}

export function planSessionProbes(
  words: { id: string }[],
  imageIdByWordId: Record<string, string>,
  limits: { picture: number; previous: number },
  randomFn: () => number = Math.random,
): SessionProbePlan {
  const picturePool: PictureProbe[] = [];
  const seenPicture = new Set<string>();
  for (const word of words) {
    const imageId = imageIdByWordId[word.id];
    if (!imageId || seenPicture.has(word.id)) continue;
    seenPicture.add(word.id);
    picturePool.push({ id: word.id, imageId });
  }
  const picture = shuffle(picturePool, randomFn).slice(0, Math.max(0, limits.picture));
  const pictureIds = new Set(picture.map((item) => item.id));

  const previousPool: string[] = [];
  const seenPrevious = new Set<string>();
  for (const word of words) {
    if (pictureIds.has(word.id) || seenPrevious.has(word.id)) continue;
    seenPrevious.add(word.id);
    previousPool.push(word.id);
  }
  return {
    picture,
    previousIds: shuffle(previousPool, randomFn).slice(0, Math.max(0, limits.previous)),
  };
}

export function dropProbeId(plan: SessionProbePlan, id: string): SessionProbePlan {
  return {
    picture: plan.picture.filter((item) => item.id !== id),
    previousIds: plan.previousIds.filter((item) => item !== id),
  };
}

/**
 * After a correct normal test card, splice that word's probe at the cursor
 * so it is the next card. Drops the id even when no probe is inserted.
 */
export function maybeInsertProbeAfterCorrect(
  state: IterateState,
  answeredId: string,
  plan: SessionProbePlan,
): { state: IterateState; plan: SessionProbePlan } {
  const picture = plan.picture.find((item) => item.id === answeredId);
  const isPrevious = plan.previousIds.includes(answeredId);
  if (!picture && !isPrevious) {
    return { state, plan };
  }
  const nextPlan = dropProbeId(plan, answeredId);
  const source = state.wordQueue.findLast((item) => item.id === answeredId);
  if (!source || source.probe) {
    return { state, plan: nextPlan };
  }
  const probeCard: WordWithMeta = {
    ...source,
    probe: picture
      ? { kind: 'recall_picture', answer: source.word, imageId: picture.imageId }
      : { kind: 'recall_previous', lag: 1, answer: source.word },
  };
  const wordQueue = state.wordQueue.slice();
  const insertAt = Math.min(Math.max(state.wordIdx, 0), wordQueue.length);
  wordQueue.splice(insertAt, 0, probeCard);
  return { state: { wordQueue, wordIdx: state.wordIdx }, plan: nextPlan };
}

function withoutPendingProbeMem(word: WordWithMeta): WordWithMeta {
  if (word.pendingProbeMemLevel === undefined) return word;
  const next = { ...word };
  delete next.pendingProbeMemLevel;
  return next;
}

export function handleProbeCorrect(
  state: IterateState,
  word: WordWithMeta,
  overrideMemLevel?: number,
): IterateState {
  const newMemLevel = overrideMemLevel ?? increaseMemLevel(word.memLevel);
  return {
    wordQueue: state.wordQueue.map((item, index) => {
      if (item.id !== word.id) return item;
      if (index > state.wordIdx) {
        return { ...item, pendingProbeMemLevel: newMemLevel };
      }
      return withoutPendingProbeMem({ ...item, memLevel: newMemLevel });
    }),
    wordIdx: state.wordIdx + 1,
  };
}

export function handleProbeMistake(state: IterateState): IterateState {
  return { wordQueue: state.wordQueue, wordIdx: state.wordIdx + 1 };
}

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
  const answered = withoutPendingProbeMem(word);

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
        ...answered,
        form: getNextForm(word.form),
        repeated,
      });
    } else {
      newQueue = updateCurrentWord({
        ...answered,
        form: getNextForm(word.form, true),
        memLevel: newMemLevel,
        repeatAgain: getRepeatAgainDate(newMemLevel),
      });
    }
  } else {
    // Test mode
    if (repeated < repetitionLimit) {
      newQueue = insertNextAtRandomPosition({
        ...answered,
        form: getNextForm(word.form, true),
        memLevel: newMemLevel,
        repeatAgain: getRepeatAgainDate(word.memLevel),
        repeated,
      });
    } else {
      newQueue = updateCurrentWord({
        ...answered,
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
    ...withoutPendingProbeMem(word),
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

/**
 * Last copy of `id`. While that copy is still ahead of the cursor, a probe hit
 * contributes its stacked memLevel. Form and repeatAgain stay on the last copy.
 * Once that copy has been answered, its own memLevel is the snapshot.
 */
function snapshotWord(wordQueue: Word[], id: string, wordIdx: number): Word | undefined {
  let last: Word | undefined;
  let lastIndex = -1;
  for (let i = 0; i < wordQueue.length; i++) {
    if (wordQueue[i].id !== id) continue;
    last = wordQueue[i];
    lastIndex = i;
  }
  if (!last) return undefined;
  const pending = (last as WordWithMeta).pendingProbeMemLevel;
  if (lastIndex >= wordIdx && pending !== undefined && pending > last.memLevel) {
    return { ...last, memLevel: pending };
  }
  return last;
}

/** Last queue occurrence of every original batch word (including never-reached). */
export function gatherLastProgress(
  words: Word[],
  wordQueue: Word[],
  wordIdx: number = wordQueue.length,
): WordProgressPair[] {
  const progress: WordProgressPair[] = [];
  for (const word of words) {
    const last = snapshotWord(wordQueue, word.id, wordIdx);
    if (!last) continue;
    progress.push({ start: word, end: last });
  }
  return progress;
}

/**
 * Unique words that already appear before the cursor. For each, the snapshot
 * end-session would persist for that word.
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
    const saved = snapshotWord(wordQueue, id, wordIdx);
    return saved ? [saved] : [];
  });
}
