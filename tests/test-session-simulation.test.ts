import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkIsDone,
  computeNewMemLevel,
  handleCorrect,
  handleMistake,
  handleOnChange,
  handleSkipWord,
  initializeQueue,
  IterateState,
} from '@/app/lib/iterate-words-logic';
import { TeachingForm, TEACHING_FORMS, Word, WordWithMeta } from '@/app/lib/definitions';
import { decreaseMemLevel, getNextForm } from '@/app/lib/word-transitions';
import { DAY_MS, MAX_MEM_LEVEL, REPEAT_SOONER_FACTOR } from '@/app/constants';
import { FORM_CORRECT_ANSWER } from '@/app/lib/form-config';

// ── Factories ────────────────────────────────────────────────────────────────

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 'w1',
    courseId: 'c1',
    word: 'hello',
    definition: 'hola',
    memLevel: 5,
    form: 'show',
    repeatAgain: new Date('2025-01-01'),
    isPriority: false,
    isSkipped: false,
    ...overrides,
  };
}

function makeWordMeta(overrides: Partial<WordWithMeta> = {}): WordWithMeta {
  return { ...makeWord(), repeated: 0, ...overrides };
}

function makeWords(count: number, defaults: Partial<Word> = {}): Word[] {
  return Array.from({ length: count }, (_, i) =>
    makeWord({
      id: `w${i + 1}`,
      word: `word${i + 1}`,
      definition: `def${i + 1}`,
      ...defaults,
    }),
  );
}

// ── Simulation types ─────────────────────────────────────────────────────────

type Action = 'correct' | 'mistake' | 'mistake_shorten' | 'skip' | 'leave';

type StepLog = {
  step: number;
  wordId: string;
  form: TeachingForm;
  memLevelBefore: number;
  action: Action;
  memLevelAfter: number;
  repeated: number;
  queueLengthAfter: number;
};

type SimulationResult = {
  log: StepLog[];
  finalQueue: WordWithMeta[];
  finalWordIdx: number;
  persistedState: Map<string, WordWithMeta>;
};

// ── Simulation engine ────────────────────────────────────────────────────────

const TEST_OPTS_BASE = {
  isLearning: false,
  repetitionLimit: 1,
  maxDistForRandom: 10,
  randomFn: () => 0,
};

function simulateSession(
  words: Word[],
  decisionFn: (word: WordWithMeta, stepIndex: number) => Action,
  options: {
    maxWordsInBatch?: number;
    isLearning?: boolean;
    repetitionLimit?: number;
    randomFn?: () => number;
  } = {},
): SimulationResult {
  const {
    maxWordsInBatch = 200,
    isLearning = false,
    repetitionLimit = 1,
    randomFn = () => 0,
  } = options;

  let state = initializeQueue(words);
  const log: StepLog[] = [];

  let safetyLimit = 500;
  while (
    state.wordIdx >= 0 &&
    !checkIsDone(state.wordIdx, state.wordQueue.length, maxWordsInBatch)
  ) {
    if (--safetyLimit <= 0) throw new Error('Simulation exceeded safety limit');

    const word = state.wordQueue[state.wordIdx];
    const action = decisionFn(word, log.length);
    const memLevelBefore = word.memLevel;

    switch (action) {
      case 'correct':
        state = handleCorrect(state, word, {
          ...TEST_OPTS_BASE,
          isLearning,
          repetitionLimit,
          randomFn,
        });
        break;
      case 'mistake':
        state = handleMistake(state, word, {
          isLearning,
          isShortenOnly: false,
        });
        break;
      case 'mistake_shorten':
        state = handleMistake(state, word, {
          isLearning,
          isShortenOnly: true,
        });
        break;
      case 'skip':
        state = handleSkipWord(state, word);
        break;
      case 'leave':
        return {
          log,
          finalQueue: state.wordQueue,
          finalWordIdx: state.wordIdx,
          persistedState: getPersistedState(words, state.wordQueue),
        };
    }

    const lastCopy = state.wordQueue.findLast((w) => w.id === word.id);
    log.push({
      step: log.length,
      wordId: word.id,
      form: word.form,
      memLevelBefore,
      action,
      memLevelAfter: lastCopy?.memLevel ?? memLevelBefore,
      repeated: word.repeated,
      queueLengthAfter: state.wordQueue.length,
    });
  }

  const persistedState = getPersistedState(words, state.wordQueue);

  return {
    log,
    finalQueue: state.wordQueue,
    finalWordIdx: state.wordIdx,
    persistedState,
  };
}

/** Mimics DoneState's findLast logic: for each original word, find the last occurrence in the queue. */
function getPersistedState(
  originalWords: Word[],
  wordQueue: WordWithMeta[],
): Map<string, WordWithMeta> {
  const result = new Map<string, WordWithMeta>();
  for (const w of originalWords) {
    const last = wordQueue.findLast((q) => q.id === w.id);
    if (last) result.set(w.id, last);
  }
  return result;
}

// ── Tests ────────────────────────────────────────────────────────────────────

const FROZEN_NOW = new Date('2025-06-01T00:00:00Z');
const FROZEN_NOW_MS = FROZEN_NOW.getTime();

describe('test-session-simulation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: FROZEN_NOW });
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Group 1: Happy path (all correct) ──────────────────────────────────

  describe('Group 1: happy path (all correct)', () => {
    const alwaysCorrect = () => 'correct' as const;

    it('1. single word starting as show: two interactions, memLevel increases twice', () => {
      const words = [makeWord({ id: 'w1', form: 'show', memLevel: 5 })];
      const result = simulateSession(words, alwaysCorrect);

      // show (not counted → repeated stays 0 → re-inserted) then choose_4_word (counted → repeated=1 ≥ limit=1 → done)
      expect(result.log).toHaveLength(2);
      expect(result.log[0].form).toBe('show');
      expect(result.log[0].action).toBe('correct');
      expect(result.log[1].form).toBe('choose_4_word');
      expect(result.log[1].action).toBe('correct');

      const persisted = result.persistedState.get('w1')!;
      // show correct: memLevel 5→6, then choose_4_word correct: 6→7
      expect(persisted.memLevel).toBe(7);
      // Test transitions: choose_4_word → choose_4_def
      expect(persisted.form).toBe('choose_4_def');
    });

    it('2. single word starting as write: one interaction, memLevel increases once', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 5 })];
      const result = simulateSession(words, alwaysCorrect);

      expect(result.log).toHaveLength(1);
      expect(result.log[0].form).toBe('write');

      const persisted = result.persistedState.get('w1')!;
      // write correct: repeated=0+1=1 ≥ limit=1 → update branch
      expect(persisted.memLevel).toBe(6);
      expect(persisted.form).toBe('write_last');
    });

    it('3. five words, all correct: memLevels increase, forms advance', () => {
      const forms: TeachingForm[] = [
        'show',
        'choose_4_word',
        'choose_4_def',
        'write',
        'write_last',
      ];
      const words = forms.map((form, i) =>
        makeWord({
          id: `w${i + 1}`,
          form,
          memLevel: 5,
          word: `word${i + 1}`,
          definition: `def${i + 1}`,
        }),
      );
      const result = simulateSession(words, alwaysCorrect);

      for (const w of words) {
        const persisted = result.persistedState.get(w.id)!;
        expect(persisted.memLevel).toBeGreaterThan(w.memLevel);
      }

      // show word gets 2 interactions (show + choose_4_word), others get 1 each
      // Total: 2 + 1 + 1 + 1 + 1 = 6
      expect(result.log).toHaveLength(6);
    });

    it('4. all 7 form types: each transitions to correct next form via TEST_TRANSITIONS', () => {
      const words = TEACHING_FORMS.map((form, i) =>
        makeWord({
          id: `w${i}`,
          form,
          memLevel: 5,
          word: `word${i}`,
          definition: `def${i}`,
        }),
      );

      const result = simulateSession(words, alwaysCorrect, {
        maxWordsInBatch: 200,
      });

      for (const form of TEACHING_FORMS) {
        const word = words.find((w) => w.form === form)!;
        const persisted = result.persistedState.get(word.id)!;
        if (form === 'show') {
          // show is special: repeated not incremented → re-inserted as choose_4_word →
          // answered correctly → repeated=1 ≥ limit=1 → updated as choose_4_def (two transitions)
          expect(persisted.form).toBe(getNextForm(getNextForm('show', true), true));
        } else {
          // All other forms: one correct answer → repeated=1 ≥ limit=1 → update with next form
          expect(persisted.form).toBe(getNextForm(form, true));
        }
      }
    });
  });

  // ── Group 2: All mistakes ──────────────────────────────────────────────

  describe('Group 2: all mistakes', () => {
    it('5. single word mistake on write: review cycle show→choose_4_word→done', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 10 })];

      let step = 0;
      const result = simulateSession(words, () => {
        step++;
        // First interaction: mistake. Then always correct for recovery.
        if (step === 1) return 'mistake';
        return 'correct';
      });

      // Step 0: write → mistake (review copy as show inserted)
      // Step 1: review show → correct (re-inserted as choose_4_word)
      // Step 2: choose_4_word → correct (done)
      expect(result.log).toHaveLength(3);
      expect(result.log[0].form).toBe('write');
      expect(result.log[0].action).toBe('mistake');
      expect(result.log[1].form).toBe('show');
      expect(result.log[1].action).toBe('correct');
      expect(result.log[2].form).toBe('choose_4_word');
      expect(result.log[2].action).toBe('correct');

      const persisted = result.persistedState.get('w1')!;
      // Mistake: 10→1, show correct: 1→2, choose_4_word correct: 2→3
      expect(persisted.memLevel).toBe(3);
      expect(persisted.form).toBe('choose_4_def');
    });

    it('6. multiple words all mistakes: queue grows, batch limit terminates', () => {
      const words = makeWords(5, { form: 'write', memLevel: 10 });
      const result = simulateSession(words, () => 'mistake', {
        maxWordsInBatch: 8,
      });

      // Every mistake adds a review copy, so queue grows beyond batch limit
      expect(result.finalWordIdx).toBe(8);
      // All processed words should have had mistakes
      result.log.forEach((entry) => {
        expect(entry.action).toBe('mistake');
      });
    });

    it('7. repeated mistakes on same word: queue grows, memLevel stays at 1', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 10 })];
      const result = simulateSession(words, () => 'mistake', {
        maxWordsInBatch: 6,
      });

      // Every step is a mistake on w1 (original + review copies that are also answered wrong)
      expect(result.log.length).toBeGreaterThan(1);

      // After first mistake memLevel drops to 1, subsequent review copies also start at 1
      const lastMistake = result.log[result.log.length - 1];
      expect(lastMistake.memLevelAfter).toBe(1);

      // Queue should have grown from review copies
      expect(result.finalQueue.length).toBeGreaterThan(1);
    });
  });

  // ── Group 3: Soften mistake ────────────────────────────────────────────

  describe('Group 3: soften mistake (isShortenOnly)', () => {
    it('8. soften on choose form: memLevel = min(8, level * 0.5) instead of 1', () => {
      const words = [makeWord({ id: 'w1', form: 'choose_4_def', memLevel: 10 })];
      const result = simulateSession(words, () => 'mistake_shorten', {
        maxWordsInBatch: 1,
      });

      expect(result.log).toHaveLength(1);
      expect(result.log[0].action).toBe('mistake_shorten');
      // decreaseMemLevel(10, true) = min(8, 10 * 0.5) = 5
      const reviewCopy = result.finalQueue.find(
        (w, i) => i > 0 && w.id === 'w1' && w.form === 'show',
      );
      expect(reviewCopy).toBeDefined();
      expect(reviewCopy!.memLevel).toBe(10 * REPEAT_SOONER_FACTOR);
    });

    it('9. soften vs full mistake: soften preserves higher memLevel', () => {
      const baseWord = { id: 'w1', form: 'write' as const, memLevel: 20 };

      // Full mistake
      const fullResult = simulateSession([makeWord(baseWord)], () => 'mistake', {
        maxWordsInBatch: 2,
      });
      const fullReview = fullResult.finalQueue.find((w, i) => i > 0 && w.id === 'w1')!;

      // Softened mistake
      const softenResult = simulateSession(
        [makeWord(baseWord)],
        () => 'mistake_shorten',
        { maxWordsInBatch: 2 },
      );
      const softenReview = softenResult.finalQueue.find(
        (w, i) => i > 0 && w.id === 'w1',
      )!;

      expect(fullReview.memLevel).toBe(1);
      // min(8, 20 * 0.5) = 8
      expect(softenReview.memLevel).toBe(8);
      expect(softenReview.memLevel).toBeGreaterThan(fullReview.memLevel);
    });
  });

  // ── Group 4: Skip word ─────────────────────────────────────────────────

  describe('Group 4: skip word', () => {
    it('10. skip marks word as skipped and removes future copies', () => {
      const words = [
        makeWord({ id: 'w1', form: 'show', memLevel: 5 }),
        makeWord({ id: 'w2', form: 'write', memLevel: 5 }),
      ];

      const result = simulateSession(words, (word) => {
        if (word.id === 'w1') return 'skip';
        return 'correct';
      });

      const persistedW1 = result.persistedState.get('w1')!;
      expect(persistedW1.isSkipped).toBe(true);

      const persistedW2 = result.persistedState.get('w2')!;
      expect(persistedW2.isSkipped).toBe(false);
      expect(persistedW2.memLevel).toBe(6);
    });

    it('11. skip word that has future copies from prior correct answer', () => {
      const words = [
        makeWord({ id: 'w1', form: 'show', memLevel: 5 }),
        makeWord({ id: 'w2', form: 'show', memLevel: 5 }),
      ];

      let w1Seen = 0;
      const result = simulateSession(words, (word) => {
        if (word.id === 'w1') {
          w1Seen++;
          // First time: correct (creates a re-inserted copy)
          if (w1Seen === 1) return 'correct';
          // Second time (re-inserted choose_4_word): skip
          return 'skip';
        }
        return 'correct';
      });

      // The persisted (findLast) state of w1 should be the skipped copy
      const persistedW1 = result.persistedState.get('w1')!;
      expect(persistedW1.isSkipped).toBe(true);

      // The last w1 in the queue is the skipped copy
      const lastW1Idx = result.finalQueue.findLastIndex((w) => w.id === 'w1');
      expect(lastW1Idx).toBeGreaterThan(0);
      expect(result.finalQueue[lastW1Idx].isSkipped).toBe(true);

      // No un-skipped w1 copies remain after the first (already-processed) entry
      const unskippedW1After = result.finalQueue.filter(
        (w, i) => w.id === 'w1' && i > 0 && !w.isSkipped,
      );
      expect(unskippedW1After).toHaveLength(0);
    });
  });

  // ── Group 5: Mixed realistic sessions ──────────────────────────────────

  describe('Group 5: mixed realistic sessions', () => {
    it('12. 5 words realistic mix: correct, correct, mistake+correct, soften, skip', () => {
      const words = [
        makeWord({ id: 'w1', form: 'choose_4_def', memLevel: 5 }),
        makeWord({ id: 'w2', form: 'write', memLevel: 8 }),
        makeWord({ id: 'w3', form: 'write', memLevel: 10 }),
        makeWord({ id: 'w4', form: 'choose_8_def', memLevel: 12 }),
        makeWord({ id: 'w5', form: 'choose_4_word', memLevel: 3 }),
      ];

      const w3Seen = { count: 0 };
      const result = simulateSession(words, (word) => {
        switch (word.id) {
          case 'w1':
            return 'correct';
          case 'w2':
            return 'correct';
          case 'w3':
            w3Seen.count++;
            if (w3Seen.count === 1) return 'mistake';
            return 'correct';
          case 'w4':
            return 'mistake_shorten';
          case 'w5':
            return 'skip';
          default:
            return 'correct';
        }
      });

      // w1: correct, memLevel increased
      const p1 = result.persistedState.get('w1')!;
      expect(p1.memLevel).toBe(6);
      expect(p1.form).toBe('write_mid');

      // w2: correct, memLevel increased
      const p2 = result.persistedState.get('w2')!;
      expect(p2.memLevel).toBe(9);
      expect(p2.form).toBe('write_last');

      // w3: mistake then recovery → memLevel dropped then climbed back partially
      const p3 = result.persistedState.get('w3')!;
      expect(p3.memLevel).toBeLessThan(10);
      expect(p3.memLevel).toBeGreaterThan(0);

      // w4: softened mistake
      const p4 = result.persistedState.get('w4')!;
      // decreaseMemLevel(12, true) = min(8, 12*0.5) = 6
      expect(p4.memLevel).toBeLessThanOrEqual(8);

      // w5: skipped
      const p5 = result.persistedState.get('w5')!;
      expect(p5.isSkipped).toBe(true);
    });

    it('13. alternating correct/mistake: queue grows from mistakes', () => {
      const words = makeWords(4, { form: 'write', memLevel: 5 });
      let stepIdx = 0;
      const result = simulateSession(words, () => {
        const action = stepIdx % 2 === 0 ? 'correct' : 'mistake';
        stepIdx++;
        return action;
      });

      // Mistakes create review copies, expanding the queue
      expect(result.finalQueue.length).toBeGreaterThan(words.length);

      const correctSteps = result.log.filter((l) => l.action === 'correct');
      const mistakeSteps = result.log.filter((l) => l.action === 'mistake');
      expect(correctSteps.length).toBeGreaterThan(0);
      expect(mistakeSteps.length).toBeGreaterThan(0);
    });
  });

  // ── Group 6: Edge cases ────────────────────────────────────────────────

  describe('Group 6: edge cases', () => {
    it('14. empty word list: session ends immediately', () => {
      const result = simulateSession([], () => 'correct');
      expect(result.log).toHaveLength(0);
      expect(result.finalWordIdx).toBe(-1);
      expect(result.persistedState.size).toBe(0);
    });

    it('15. word with memLevel=0: increaseMemLevel(0) = 1', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 0 })];
      const result = simulateSession(words, () => 'correct');

      const persisted = result.persistedState.get('w1')!;
      expect(persisted.memLevel).toBe(1);
    });

    it('16. word near MAX_MEM_LEVEL: memLevel capped at 150', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: MAX_MEM_LEVEL - 1 })];
      // increaseMemLevel for high levels uses random factor;
      // with Math.random mocked to 0, factor = SUCCESS_INCREASE_MIN = 1.4
      // next = 1 + ceil(149 * 1.4) = 1 + 209 = 210 → capped at MAX_MEM_LEVEL (150)
      const result = simulateSession(words, () => 'correct');

      const persisted = result.persistedState.get('w1')!;
      expect(persisted.memLevel).toBeLessThanOrEqual(MAX_MEM_LEVEL);
      expect(persisted.memLevel).toBe(MAX_MEM_LEVEL);
    });

    it('17. mistake when word has multiple queue entries: review inserted after LAST occurrence', () => {
      // Manually build a state where w1 already has a future copy
      const w1Show = makeWordMeta({ id: 'w1', form: 'show', memLevel: 5, repeated: 0 });
      const w2 = makeWordMeta({ id: 'w2', form: 'write', memLevel: 5 });
      const w1Future = makeWordMeta({
        id: 'w1',
        form: 'choose_4_word',
        memLevel: 6,
        repeated: 0,
      });
      const w3 = makeWordMeta({ id: 'w3', form: 'write', memLevel: 5 });

      const state: IterateState = {
        wordQueue: [w1Show, w2, w1Future, w3],
        wordIdx: 0,
      };

      // Mistake on w1 at index 0
      const newState = handleMistake(state, w1Show, {
        isLearning: false,
        isShortenOnly: false,
      });

      // findLastIndex(w1) = 2 (the choose_4_word copy), insert at 2+2 = 4
      expect(newState.wordQueue).toHaveLength(5);
      expect(newState.wordQueue[4].id).toBe('w1');
      expect(newState.wordQueue[4].form).toBe('show');
      expect(newState.wordQueue[4].memLevel).toBe(1);
    });

    it('18. batch limit stops mid-session: partial state is preserved', () => {
      const words = makeWords(3, { form: 'write', memLevel: 5 });

      // Mistakes expand queue, batch limit of 4 stops before all reviews
      const result = simulateSession(words, () => 'mistake', {
        maxWordsInBatch: 4,
      });

      expect(result.finalWordIdx).toBe(4);
      // Some words may not have been processed at all, some have review copies
      expect(result.log).toHaveLength(4);

      // Queue grew from mistakes (each adds a review copy)
      expect(result.finalQueue.length).toBeGreaterThan(3);
    });

    it('19. mistake preserves repeated counter on review copy', () => {
      // Word with repeated=0, gets mistake
      const word = makeWordMeta({ id: 'w1', form: 'write', memLevel: 5, repeated: 0 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const newState = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: false,
      });

      // Review copy has repeated=0 (spread from word)
      const review = newState.wordQueue[2];
      expect(review.id).toBe('w1');
      expect(review.form).toBe('show');
      expect(review.repeated).toBe(0);

      // Now answer the review show correctly (in test mode):
      // show doesn't increment repeated → repeated stays 0 → 0 < 1 → INSERT branch
      const state2: IterateState = { wordQueue: newState.wordQueue, wordIdx: 2 };
      const afterCorrect = handleCorrect(state2, review, {
        ...TEST_OPTS_BASE,
        isLearning: false,
      });

      // Word should be re-inserted with next form (choose_4_word), not just updated in place
      const reinserted = afterCorrect.wordQueue.find(
        (w, i) => i > 2 && w.id === 'w1' && w.form === 'choose_4_word',
      );
      expect(reinserted).toBeDefined();
      expect(reinserted!.repeated).toBe(0);
    });
  });

  // ── Group 7: Persisted state validation ────────────────────────────────

  describe('Group 7: persisted state validation (findLast)', () => {
    it('20. findLast picks the correct final copy after multiple manipulations', () => {
      const words = [
        makeWord({ id: 'w1', form: 'show', memLevel: 5 }),
        makeWord({ id: 'w2', form: 'write', memLevel: 8 }),
      ];

      const result = simulateSession(words, () => 'correct');

      // w1: show→correct (insert choose_4_word), then choose_4_word→correct (update in place)
      // The LAST copy of w1 in the queue should be the updated choose_4_word→choose_4_def
      const p1 = result.persistedState.get('w1')!;
      expect(p1.form).toBe('choose_4_def');
      expect(p1.memLevel).toBe(7); // 5→6→7

      // w2: write→correct (update in place as write_last)
      const p2 = result.persistedState.get('w2')!;
      expect(p2.form).toBe('write_last');
      expect(p2.memLevel).toBe(9); // 8→9

      // Verify repeatAgain is based on OLD memLevel (test mode behavior)
      expect(p2.repeatAgain).toEqual(new Date(FROZEN_NOW_MS + 8 * DAY_MS));
    });

    it('21. session ends mid-review: unprocessed review copy is what gets persisted', () => {
      const words = [
        makeWord({ id: 'w1', form: 'write', memLevel: 10 }),
        makeWord({ id: 'w2', form: 'write', memLevel: 8 }),
      ];

      // w1 mistakes, w2 mistakes. With batch limit of 3, we process:
      // idx 0: w1 mistake → review at idx 2
      // idx 1: w2 mistake → review at idx 3 (or 4)
      // idx 2: w1 review (show)
      // idx 3: batch limit hit, w2 review unprocessed
      const result = simulateSession(
        words,
        (word) => {
          if (word.form === 'show') return 'correct';
          return 'mistake';
        },
        { maxWordsInBatch: 3 },
      );

      // w2 should be persisted with the review copy state (show, decreased memLevel)
      // since the session ended before processing it
      const p2 = result.persistedState.get('w2')!;
      // The LAST copy is the unprocessed review with form=show, memLevel=1
      expect(p2.form).toBe('show');
      expect(p2.memLevel).toBe(1);
    });
  });

  // ── Group 8: Soften Mistake override ─────────────────────────────────

  describe('Group 8: Soften Mistake override (fixed in TeachWord.tsx)', () => {
    it('22. overrideMemLevel correctly reflects softened preview after fix', () => {
      const word = makeWordMeta({
        id: 'w1',
        form: 'choose_4_def',
        memLevel: 20,
        repeated: 0,
      });

      // Full mistake gives memLevel = 1
      const fullMistakeLevel = computeNewMemLevel(word, false, {
        isLearning: false,
        isShortenOnly: false,
      });
      expect(fullMistakeLevel).toBe(1);

      // Softened mistake gives memLevel = min(8, 20 * 0.5) = 8
      const softenedLevel = computeNewMemLevel(word, false, {
        isLearning: false,
        isShortenOnly: true,
      });
      expect(softenedLevel).toBe(8);

      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };

      // After fix: onRevertMistake calls onPreviewMemLevel(false, true) which
      // recomputes the preview with isShortenOnly=true, so overrideMemLevel
      // is now the softened value (8), not the full penalty (1).
      const result = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: true,
        overrideMemLevel: softenedLevel, // 8 — correct after fix
      });

      const review = result.wordQueue.find((w, i) => i > 0 && w.id === 'w1')!;

      expect(review.memLevel).toBe(softenedLevel);
      expect(review.memLevel).toBe(8);
      expect(review.repeatAgain).toEqual(new Date(FROZEN_NOW_MS + 8 * DAY_MS));
    });

    it('22b. stale full-penalty override would produce wrong result (regression guard)', () => {
      const word = makeWordMeta({
        id: 'w1',
        form: 'choose_4_def',
        memLevel: 20,
        repeated: 0,
      });

      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };

      // If the override were still the full-penalty value (1), the soften
      // would be silently ignored — this is the old buggy behavior.
      const buggyResult = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: true,
        overrideMemLevel: 1, // stale full-penalty override
      });

      const buggyReview = buggyResult.wordQueue.find((w, i) => i > 0 && w.id === 'w1')!;

      // Override takes precedence, so memLevel = 1 regardless of isShortenOnly
      expect(buggyReview.memLevel).toBe(1);
      expect(buggyReview.memLevel).not.toBe(8);
    });
  });

  // ── Additional: form-specific answer target consistency ────────────────

  describe('form-answer consistency', () => {
    it('every non-show form has a defined answer target', () => {
      for (const form of TEACHING_FORMS) {
        if (form === 'show') {
          expect(FORM_CORRECT_ANSWER[form]).toBeNull();
        } else {
          expect(FORM_CORRECT_ANSWER[form]).toBeDefined();
          expect(['word', 'definition']).toContain(FORM_CORRECT_ANSWER[form]);
        }
      }
    });

    it('test mode cycles through all forms starting from show', () => {
      const visited = new Set<TeachingForm>();
      let form: TeachingForm = 'show';
      for (let i = 0; i < 20; i++) {
        visited.add(form);
        form = getNextForm(form, true);
      }
      expect(visited.size).toBe(TEACHING_FORMS.length);
    });

    it('repeatAgain uses OLD memLevel in test mode handleCorrect (documented behavior)', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 5, repeated: 0 });
      const state: IterateState = { wordQueue: [word], wordIdx: 0 };

      const result = handleCorrect(state, word, {
        ...TEST_OPTS_BASE,
        isLearning: false,
      });

      // memLevel increased: 5 → 6
      expect(result.wordQueue[0].memLevel).toBe(6);
      // But repeatAgain uses OLD memLevel (5)
      expect(result.wordQueue[0].repeatAgain).toEqual(
        new Date(FROZEN_NOW_MS + 5 * DAY_MS),
      );
    });
  });

  // ── Group 9: Learning mode simulation ─────────────────────────────────

  describe('Group 9: learning mode simulation', () => {
    it('23. all correct, learning mode: memLevel unchanged for non-write_last', () => {
      const words = [
        makeWord({ id: 'w1', form: 'choose_4_word', memLevel: 5 }),
        makeWord({ id: 'w2', form: 'write', memLevel: 8 }),
      ];
      const result = simulateSession(words, () => 'correct', {
        isLearning: true,
        repetitionLimit: 3,
      });

      const p1 = result.persistedState.get('w1')!;
      expect(p1.memLevel).toBe(5);
      expect(p1.form).toBe('write');

      // w2 transitions through write_last which DOES increase memLevel
      const p2 = result.persistedState.get('w2')!;
      expect(p2.memLevel).toBe(9);
    });

    it('24. write_last in learning mode: memLevel increases', () => {
      const words = [makeWord({ id: 'w1', form: 'write_last', memLevel: 5 })];
      const result = simulateSession(words, () => 'correct', {
        isLearning: true,
        repetitionLimit: 3,
      });

      const persisted = result.persistedState.get('w1')!;
      expect(persisted.memLevel).toBe(6);
      expect(persisted.form).toBe('choose_4_def');
    });

    it('25. mistake in learning mode: memLevel unchanged on review copy', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 10 })];
      let step = 0;
      const result = simulateSession(
        words,
        () => {
          step++;
          if (step === 1) return 'mistake';
          return 'correct';
        },
        { isLearning: true, repetitionLimit: 3 },
      );

      const persisted = result.persistedState.get('w1')!;
      expect(persisted.memLevel).toBe(10);
    });

    it('26. learning mode uses LEARN transitions (no write_mid)', () => {
      const words = [makeWord({ id: 'w1', form: 'choose_4_def', memLevel: 5 })];
      const result = simulateSession(words, () => 'correct', {
        isLearning: true,
        repetitionLimit: 3,
      });

      const allForms = result.log.map((l) => l.form);
      expect(allForms).not.toContain('write_mid');
      expect(allForms).toContain('choose_8_def');
    });
  });

  // ── Group 10: repetitionLimit > 1 ─────────────────────────────────────

  describe('Group 10: repetitionLimit > 1', () => {
    it('27. test mode repetitionLimit=2: word seen twice before completion', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 5 })];
      const result = simulateSession(words, () => 'correct', {
        repetitionLimit: 2,
      });

      expect(result.log).toHaveLength(2);
      expect(result.log[0].form).toBe('write');
      expect(result.log[1].form).toBe('write_last');

      const persisted = result.persistedState.get('w1')!;
      expect(persisted.memLevel).toBe(7); // 5→6→7
    });

    it('28. test mode repetitionLimit=3: word cycles through 3 forms', () => {
      const words = [makeWord({ id: 'w1', form: 'choose_4_def', memLevel: 5 })];
      const result = simulateSession(words, () => 'correct', {
        repetitionLimit: 3,
      });

      expect(result.log).toHaveLength(3);
      expect(result.log[0].form).toBe('choose_4_def');
      expect(result.log[1].form).toBe('write_mid');
      expect(result.log[2].form).toBe('choose_8_def');

      const persisted = result.persistedState.get('w1')!;
      expect(persisted.memLevel).toBe(8); // 5→6→7→8
      expect(persisted.form).toBe('write');
    });
  });

  // ── Group 11: Random insertion variation ──────────────────────────────

  describe('Group 11: random insertion variation', () => {
    it('29. different randomFn values change processing order but produce valid states', () => {
      const words = makeWords(4, { form: 'show', memLevel: 5 });
      const resultNear = simulateSession(words, () => 'correct', {
        randomFn: () => 0,
      });
      const resultFar = simulateSession(words, () => 'correct', {
        randomFn: () => 0.99,
      });

      expect(resultNear.log.length).toBeGreaterThan(0);
      expect(resultFar.log.length).toBeGreaterThan(0);

      // randomFn only affects insertion position, not the final state
      const nearOrder = resultNear.log.map((l) => `${l.wordId}:${l.form}`);
      const farOrder = resultFar.log.map((l) => `${l.wordId}:${l.form}`);
      expect(nearOrder).not.toEqual(farOrder);

      for (const w of words) {
        const pNear = resultNear.persistedState.get(w.id)!;
        const pFar = resultFar.persistedState.get(w.id)!;
        expect(pFar.memLevel).toBe(pNear.memLevel);
        expect(pFar.form).toBe(pNear.form);
      }
    });

    it('30. randomFn=0.5 with many words produces valid session', () => {
      const words = makeWords(8, { form: 'write', memLevel: 5 });
      const result = simulateSession(words, () => 'correct', {
        randomFn: () => 0.5,
      });

      for (const w of words) {
        const persisted = result.persistedState.get(w.id)!;
        expect(persisted).toBeDefined();
        expect(persisted.memLevel).toBeGreaterThan(w.memLevel);
      }
    });
  });

  // ── Group 12: Mid-session word editing ────────────────────────────────

  describe('Group 12: mid-session word editing', () => {
    it('31. edit word definition mid-session: all queue copies updated', () => {
      const w1 = makeWordMeta({
        id: 'w1',
        form: 'show',
        memLevel: 5,
        repeated: 0,
        word: 'hello',
        definition: 'hola',
      });
      const w2 = makeWordMeta({
        id: 'w2',
        form: 'write',
        memLevel: 5,
        word: 'world',
        definition: 'mundo',
      });

      let state: IterateState = { wordQueue: [w1, w2], wordIdx: 0 };

      // show → correct inserts choose_4_word copy of w1
      state = handleCorrect(state, w1, { ...TEST_OPTS_BASE, isLearning: false });

      // Edit w1's definition mid-session
      const editedWord = makeWord({
        id: 'w1',
        word: 'hello',
        definition: 'hola (greeting)',
      });
      state = { ...state, wordQueue: handleOnChange(state.wordQueue, editedWord) };

      const w1Copies = state.wordQueue.filter((w) => w.id === 'w1');
      expect(w1Copies.length).toBeGreaterThan(1);
      w1Copies.forEach((copy) => {
        expect(copy.definition).toBe('hola (greeting)');
      });

      // w2 unchanged
      expect(state.wordQueue.find((w) => w.id === 'w2')!.definition).toBe('mundo');
    });

    it('32. edit memLevel mid-session: persisted state reflects edit', () => {
      const words = [
        makeWord({ id: 'w1', form: 'write', memLevel: 10 }),
        makeWord({ id: 'w2', form: 'write', memLevel: 5 }),
      ];
      let state = initializeQueue(words);

      // w1 → correct (UPDATE: memLevel 10→11)
      state = handleCorrect(state, state.wordQueue[0], {
        ...TEST_OPTS_BASE,
        isLearning: false,
      });

      // Edit w2's memLevel to 12 before it's processed (stays in simple +1 range)
      const editedW2 = makeWord({
        id: 'w2',
        word: 'word2',
        definition: 'def2',
        memLevel: 12,
      });
      state = { ...state, wordQueue: handleOnChange(state.wordQueue, editedW2) };

      // w2 → correct (UPDATE: memLevel 12→13)
      state = handleCorrect(state, state.wordQueue[state.wordIdx], {
        ...TEST_OPTS_BASE,
        isLearning: false,
      });

      const persistedW2 = state.wordQueue.findLast((w) => w.id === 'w2')!;
      expect(persistedW2.memLevel).toBe(13);
    });
  });

  // ── Group 13: Repeat sooner ───────────────────────────────────────────

  describe('Group 13: repeat sooner', () => {
    it('33. repeatSooner decreases memLevel on all queue copies', () => {
      const w1 = makeWordMeta({
        id: 'w1',
        form: 'choose_4_word',
        memLevel: 20,
        repeated: 0,
      });
      const w2 = makeWordMeta({ id: 'w2', form: 'write', memLevel: 5 });
      const w1Future = makeWordMeta({
        id: 'w1',
        form: 'choose_4_def',
        memLevel: 20,
        repeated: 0,
      });

      const wordQueue = [w1, w2, w1Future];

      // Mimic IterateWords.repeatSooner: onChange({ ...word, memLevel: decreaseMemLevel(word.memLevel, true) })
      const reduced = makeWord({ id: 'w1', memLevel: decreaseMemLevel(20, true) });
      const updatedQueue = handleOnChange(wordQueue, reduced);

      // decreaseMemLevel(20, true) = min(8, 20*0.5) = 8
      const w1Copies = updatedQueue.filter((w) => w.id === 'w1');
      expect(w1Copies).toHaveLength(2);
      w1Copies.forEach((copy) => {
        expect(copy.memLevel).toBe(8);
      });

      expect(updatedQueue.find((w) => w.id === 'w2')!.memLevel).toBe(5);
    });
  });

  // ── Group 14: Early termination (onLeave) ─────────────────────────────

  describe('Group 14: early termination (onLeave)', () => {
    it('34. leave mid-session: partial progress preserved', () => {
      const words = makeWords(5, { form: 'write', memLevel: 5 });
      let stepCount = 0;
      const result = simulateSession(words, () => {
        stepCount++;
        if (stepCount <= 2) return 'correct';
        return 'leave';
      });

      // 2 correct answers processed, leave fires before 3rd word's action takes effect
      expect(result.log).toHaveLength(2);

      const p1 = result.persistedState.get('w1')!;
      expect(p1.memLevel).toBe(6);
      const p2 = result.persistedState.get('w2')!;
      expect(p2.memLevel).toBe(6);

      // Remaining words untouched
      for (const id of ['w3', 'w4', 'w5']) {
        expect(result.persistedState.get(id)!.memLevel).toBe(5);
      }

      expect(result.finalWordIdx).toBe(2);
    });

    it('35. leave on first word: no progress at all', () => {
      const words = makeWords(3, { form: 'write', memLevel: 5 });
      const result = simulateSession(words, () => 'leave');

      expect(result.log).toHaveLength(0);
      expect(result.finalWordIdx).toBe(0);

      for (const w of words) {
        expect(result.persistedState.get(w.id)!.memLevel).toBe(5);
      }
    });
  });

  // ── Group 15: Non-integer memLevel ────────────────────────────────────

  describe('Group 15: non-integer memLevel', () => {
    it('36. softened decrease on odd memLevel produces fractional value', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 3 })];
      const result = simulateSession(words, () => 'mistake_shorten', {
        maxWordsInBatch: 1,
      });

      const reviewCopy = result.finalQueue.find((w, i) => i > 0 && w.id === 'w1')!;
      // decreaseMemLevel(3, true) = min(8, 3 * 0.5) = 1.5
      expect(reviewCopy.memLevel).toBe(1.5);
      expect(Number.isInteger(reviewCopy.memLevel)).toBe(false);
    });

    it('37. fractional memLevel flows correctly through subsequent correct answer', () => {
      const words = [makeWord({ id: 'w1', form: 'write', memLevel: 3 })];
      let step = 0;
      const result = simulateSession(words, () => {
        step++;
        if (step === 1) return 'mistake_shorten';
        return 'correct';
      });

      // Step 0: write → mistake_shorten → review show with memLevel=1.5
      // Step 1: show → correct → re-insert choose_4_word with memLevel=2.5
      // Step 2: choose_4_word → correct → update with memLevel=3.5
      expect(result.log).toHaveLength(3);

      const persisted = result.persistedState.get('w1')!;
      // increaseMemLevel(1.5) = 1.5 + 1 = 2.5 (show, but memLevel still increases in test mode)
      // increaseMemLevel(2.5) = 2.5 + 1 = 3.5
      expect(persisted.memLevel).toBe(3.5);
    });
  });
});
