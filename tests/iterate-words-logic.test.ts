import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateProgress,
  checkIsDone,
  handleCorrect,
  handleMistake,
  handleOnChange,
  handleSkipWord,
  initializeQueue,
  IterateState,
} from '@/app/lib/iterate-words-logic';
import { TEACHING_FORMS, TeachingForm, Word, WordWithMeta } from '@/app/lib/definitions';
import { getNextForm } from '@/app/lib/word-transitions';
import { DAY_MS, REPEAT_SOONER_FACTOR } from '@/app/constants';

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
  return {
    ...makeWord(),
    repeated: 0,
    ...overrides,
  };
}

const FROZEN_NOW = new Date('2025-06-01T00:00:00Z');
const FROZEN_NOW_MS = FROZEN_NOW.getTime();

describe('iterate-words-logic', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: FROZEN_NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── initializeQueue ──────────────────────────────────────────────────
  describe('initializeQueue', () => {
    it('creates queue with repeated=0 for each word', () => {
      const words = [makeWord({ id: 'w1' }), makeWord({ id: 'w2' })];
      const state = initializeQueue(words);
      expect(state.wordQueue).toHaveLength(2);
      expect(state.wordQueue[0].repeated).toBe(0);
      expect(state.wordQueue[1].repeated).toBe(0);
      expect(state.wordIdx).toBe(0);
    });

    it('returns wordIdx -1 for empty input', () => {
      const state = initializeQueue([]);
      expect(state.wordQueue).toHaveLength(0);
      expect(state.wordIdx).toBe(-1);
    });

    it('does not mutate input array', () => {
      const words = [makeWord({ id: 'w1' })];
      const original = { ...words[0] };
      initializeQueue(words);
      expect(words[0]).toEqual(original);
      expect((words[0] as WordWithMeta).repeated).toBeUndefined();
    });

    it('handles single word', () => {
      const state = initializeQueue([makeWord({ id: 'w1' })]);
      expect(state.wordQueue).toHaveLength(1);
      expect(state.wordIdx).toBe(0);
    });
  });

  // ── checkIsDone ──────────────────────────────────────────────────────
  describe('checkIsDone', () => {
    it('true when wordIdx equals queueLength', () => {
      expect(checkIsDone(5, 5, 100)).toBe(true);
    });

    it('true when wordIdx exceeds queueLength', () => {
      expect(checkIsDone(6, 5, 100)).toBe(true);
    });

    it('true when wordIdx equals maxWordsInBatch', () => {
      expect(checkIsDone(10, 100, 10)).toBe(true);
    });

    it('true when wordIdx exceeds maxWordsInBatch', () => {
      expect(checkIsDone(11, 100, 10)).toBe(true);
    });

    it('false when wordIdx is within both bounds', () => {
      expect(checkIsDone(3, 10, 10)).toBe(false);
    });

    it('true when wordIdx is 0 and queue is empty', () => {
      expect(checkIsDone(0, 0, 10)).toBe(true);
    });
  });

  // ── calculateProgress ────────────────────────────────────────────────
  describe('calculateProgress', () => {
    it('returns 0 at start', () => {
      expect(calculateProgress(0, 10, 20)).toBe(0);
    });

    it('returns 100 when at queueLength', () => {
      expect(calculateProgress(10, 10, 20)).toBe(100);
    });

    it('uses smaller of queueLength and maxWordsInBatch as denominator', () => {
      expect(calculateProgress(5, 20, 10)).toBe(50);
      expect(calculateProgress(5, 10, 20)).toBe(50);
    });

    it('rounds to nearest integer', () => {
      expect(calculateProgress(1, 3, 10)).toBe(33);
      expect(calculateProgress(2, 3, 10)).toBe(67);
    });
  });

  // ── handleCorrect ────────────────────────────────────────────────────
  describe('handleCorrect', () => {
    const learnOpts = (overrides: Record<string, unknown> = {}) => ({
      isLearning: true,
      repetitionLimit: 3,
      maxDistForRandom: 10,
      randomFn: () => 0,
      ...overrides,
    });

    const testOpts = (overrides: Record<string, unknown> = {}) => ({
      isLearning: false,
      repetitionLimit: 1,
      maxDistForRandom: 10,
      randomFn: () => 0,
      ...overrides,
    });

    describe('learning mode', () => {
      it('show form: repeated is NOT incremented', () => {
        const word = makeWordMeta({ form: 'show', repeated: 1 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, learnOpts());
        const inserted = result.wordQueue.find(
          (w, i) => i > 0 && w.id === 'w1' && w.form === 'choose_4_word',
        );
        expect(inserted).toBeDefined();
        expect(inserted!.repeated).toBe(1);
      });

      it('non-show form: repeated is incremented', () => {
        const word = makeWordMeta({ form: 'choose_4_word', repeated: 0 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, learnOpts());
        const inserted = result.wordQueue.find(
          (w, i) => i > 0 && w.id === 'w1' && w.form === 'choose_4_def',
        );
        expect(inserted).toBeDefined();
        expect(inserted!.repeated).toBe(1);
      });

      it('inserts next form at random position when repeated < limit', () => {
        const word = makeWordMeta({ form: 'show', repeated: 0 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, learnOpts());
        expect(result.wordQueue).toHaveLength(4);
        expect(result.wordIdx).toBe(1);
        // randomFn=0 → randomIdx = min(2+0+0, 0+10) = 2
        expect(result.wordQueue[2].form).toBe('choose_4_word');
        expect(result.wordQueue[2].id).toBe('w1');
      });

      it('does NOT increase memLevel for non-write_last forms even when repeated >= limit', () => {
        const word = makeWordMeta({ form: 'write_mid', repeated: 2, memLevel: 5 });
        const state: IterateState = { wordQueue: [word], wordIdx: 0 };
        // repeated = 2+1=3, limit=3 → goes to else branch
        const result = handleCorrect(state, word, learnOpts({ repetitionLimit: 3 }));
        expect(result.wordQueue[0].memLevel).toBe(5); // unchanged
        expect(result.wordQueue[0].form).toBe('choose_8_def');
        expect(result.wordQueue[0].repeatAgain).toEqual(
          new Date(FROZEN_NOW_MS + 5 * DAY_MS),
        );
      });

      it('write_last: always updates current word and increases memLevel', () => {
        const word = makeWordMeta({ form: 'write_last', repeated: 0, memLevel: 5 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, learnOpts());
        expect(result.wordQueue).toHaveLength(2); // no insertion
        expect(result.wordQueue[0].memLevel).toBe(6);
        expect(result.wordQueue[0].form).toBe('choose_4_def');
        expect(result.wordQueue[0].repeatAgain).toEqual(
          new Date(FROZEN_NOW_MS + 6 * DAY_MS),
        );
      });

      it('write_last: goes to update branch even when repeated < limit', () => {
        const word = makeWordMeta({ form: 'write_last', repeated: 0, memLevel: 3 });
        const state: IterateState = { wordQueue: [word], wordIdx: 0 };
        const result = handleCorrect(state, word, learnOpts({ repetitionLimit: 10 }));
        // write_last short-circuits to update branch
        expect(result.wordQueue).toHaveLength(1);
        expect(result.wordQueue[0].memLevel).toBe(4);
      });

      it('form progression: show → choose_4_word → choose_4_def → choose_8_def → write → write_last', () => {
        const forms = [
          'show',
          'choose_4_word',
          'choose_4_def',
          'choose_8_def',
          'write',
        ] as const;
        const expectedNext = [
          'choose_4_word',
          'choose_4_def',
          'choose_8_def',
          'write',
          'write_last',
        ] as const;

        for (let i = 0; i < forms.length; i++) {
          const word = makeWordMeta({ form: forms[i], repeated: 0 });
          const state: IterateState = {
            wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
            wordIdx: 0,
          };
          const result = handleCorrect(state, word, learnOpts({ repetitionLimit: 10 }));
          const inserted = result.wordQueue.find((w, idx) => idx > 0 && w.id === 'w1');
          expect(inserted?.form).toBe(expectedNext[i]);
        }
      });
    });

    describe('test mode', () => {
      it('inserts word with increased memLevel when repeated < limit', () => {
        const word = makeWordMeta({ form: 'show', repeated: 0, memLevel: 5 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, testOpts({ repetitionLimit: 2 }));
        expect(result.wordQueue).toHaveLength(4);
        const inserted = result.wordQueue[2];
        expect(inserted.memLevel).toBe(6);
        expect(inserted.form).toBe('choose_4_word');
        expect(inserted.repeated).toBe(0); // show doesn't increment
      });

      it('updates current word when repeated >= limit', () => {
        const word = makeWordMeta({ form: 'write', repeated: 0, memLevel: 5 });
        const state: IterateState = { wordQueue: [word], wordIdx: 0 };
        // repeated = 0+1=1, limit=1 → update branch
        const result = handleCorrect(state, word, testOpts({ repetitionLimit: 1 }));
        expect(result.wordQueue).toHaveLength(1);
        expect(result.wordQueue[0].memLevel).toBe(6);
        expect(result.wordQueue[0].form).toBe('write_last');
      });

      it('repeatAgain uses pre-increase memLevel (existing behavior)', () => {
        const word = makeWordMeta({ form: 'write', repeated: 0, memLevel: 5 });
        const state: IterateState = { wordQueue: [word], wordIdx: 0 };
        const result = handleCorrect(state, word, testOpts({ repetitionLimit: 1 }));
        expect(result.wordQueue[0].memLevel).toBe(6);
        // repeatAgain based on OLD memLevel (5), not new (6)
        expect(result.wordQueue[0].repeatAgain).toEqual(
          new Date(FROZEN_NOW_MS + 5 * DAY_MS),
        );
      });

      it('increases memLevel in both insert and update branches', () => {
        // Insert branch (show form, repeated=0 < limit=2)
        const word1 = makeWordMeta({ form: 'show', repeated: 0, memLevel: 3 });
        const state1: IterateState = {
          wordQueue: [word1, makeWordMeta({ id: 'w2' })],
          wordIdx: 0,
        };
        const result1 = handleCorrect(state1, word1, testOpts({ repetitionLimit: 2 }));
        const inserted = result1.wordQueue.find((w, i) => i > 0 && w.id === 'w1');
        expect(inserted!.memLevel).toBe(4);

        // Update branch (write form, repeated=0+1=1 >= limit=1)
        const word2 = makeWordMeta({ form: 'write', repeated: 0, memLevel: 3 });
        const state2: IterateState = { wordQueue: [word2], wordIdx: 0 };
        const result2 = handleCorrect(state2, word2, testOpts({ repetitionLimit: 1 }));
        expect(result2.wordQueue[0].memLevel).toBe(4);
      });

      it('form progression includes write_mid: choose_4_def → write_mid → choose_8_def → write → write_last → choose_4_def', () => {
        const forms = [
          'choose_4_def',
          'write_mid',
          'choose_8_def',
          'write',
          'write_last',
        ] as const;
        const expectedNext = [
          'write_mid',
          'choose_8_def',
          'write',
          'write_last',
          'choose_4_def',
        ] as const;

        for (let i = 0; i < forms.length; i++) {
          const word = makeWordMeta({ form: forms[i], repeated: 0 });
          const state: IterateState = {
            wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
            wordIdx: 0,
          };
          const result = handleCorrect(state, word, testOpts({ repetitionLimit: 10 }));
          const inserted = result.wordQueue.find((w, idx) => idx > 0 && w.id === 'w1');
          expect(inserted?.form).toBe(expectedNext[i]);
        }
      });
    });

    describe('random insertion position', () => {
      it('inserts at minimum position (2 ahead) with randomFn=0', () => {
        const words = Array.from({ length: 10 }, (_, i) => makeWordMeta({ id: `w${i}` }));
        const state: IterateState = { wordQueue: words, wordIdx: 0 };
        const result = handleCorrect(state, words[0], {
          isLearning: true,
          repetitionLimit: 10,
          maxDistForRandom: 10,
          randomFn: () => 0,
        });
        // randomIdx = min(2+0+0, 0+10) = 2
        expect(result.wordQueue[2].form).toBe('choose_4_word');
      });

      it('respects maxDistForRandom cap', () => {
        const words = Array.from({ length: 20 }, (_, i) => makeWordMeta({ id: `w${i}` }));
        const state: IterateState = { wordQueue: words, wordIdx: 0 };
        const result = handleCorrect(state, words[0], {
          isLearning: true,
          repetitionLimit: 10,
          maxDistForRandom: 5,
          randomFn: () => 0.99,
        });
        // Without cap: 2+0+floor(0.99*20) = 2+19 = 21
        // With cap: min(21, 0+5) = 5
        expect(result.wordQueue[5].form).toBe('choose_4_word');
        expect(result.wordQueue[5].id).toBe('w0');
      });

      it('inserts further when randomFn is high', () => {
        const words = Array.from({ length: 10 }, (_, i) => makeWordMeta({ id: `w${i}` }));
        const state: IterateState = { wordQueue: words, wordIdx: 0 };
        const result = handleCorrect(state, words[0], {
          isLearning: true,
          repetitionLimit: 10,
          maxDistForRandom: 20,
          randomFn: () => 0.5,
        });
        // randomIdx = min(2+0+floor(0.5*10), 0+20) = min(7, 20) = 7
        expect(result.wordQueue[7].form).toBe('choose_4_word');
        expect(result.wordQueue[7].id).toBe('w0');
      });

      it('minimum position shifts with wordIdx', () => {
        const words = Array.from({ length: 10 }, (_, i) => makeWordMeta({ id: `w${i}` }));
        const state: IterateState = { wordQueue: words, wordIdx: 3 };
        const result = handleCorrect(state, words[3], {
          isLearning: true,
          repetitionLimit: 10,
          maxDistForRandom: 10,
          randomFn: () => 0,
        });
        // randomIdx = min(2+3+0, 3+10) = 5
        expect(result.wordQueue[5].form).toBe('choose_4_word');
        expect(result.wordQueue[5].id).toBe('w3');
      });
    });

    it('always advances wordIdx by 1', () => {
      const state: IterateState = {
        wordQueue: [makeWordMeta(), makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleCorrect(state, state.wordQueue[0], {
        isLearning: true,
        repetitionLimit: 3,
        maxDistForRandom: 10,
        randomFn: () => 0,
      });
      expect(result.wordIdx).toBe(1);
    });

    it('handles correct on last word in queue (learning write_last)', () => {
      const word = makeWordMeta({ form: 'write_last', memLevel: 5 });
      const state: IterateState = {
        wordQueue: [makeWordMeta({ id: 'w0' }), word],
        wordIdx: 1,
      };
      const result = handleCorrect(state, word, {
        isLearning: true,
        repetitionLimit: 3,
        maxDistForRandom: 10,
        randomFn: () => 0,
      });
      expect(result.wordIdx).toBe(2);
      expect(result.wordQueue[1].memLevel).toBe(6);
    });
  });

  // ── handleMistake ────────────────────────────────────────────────────
  describe('handleMistake', () => {
    it('resets form to show', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 5 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      const reviewCopy = result.wordQueue[2];
      expect(reviewCopy.form).toBe('show');
    });

    it('learning mode: memLevel unchanged', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 5 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      expect(result.wordQueue[2].memLevel).toBe(5);
    });

    it('test mode: memLevel drops to 1 without shortenOnly', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 5 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: false,
      });
      expect(result.wordQueue[2].memLevel).toBe(1);
    });

    it('test mode with shortenOnly: memLevel = min(8, level * REPEAT_SOONER_FACTOR)', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 6 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: true,
      });
      expect(result.wordQueue[2].memLevel).toBe(6 * REPEAT_SOONER_FACTOR);
    });

    it('inserts review copy 2 positions after last occurrence of word', () => {
      const word = makeWordMeta({ form: 'write' });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      // findLastIndex → 0, splice at 0+2=2
      expect(result.wordQueue).toHaveLength(4);
      expect(result.wordQueue[2].id).toBe('w1');
      expect(result.wordQueue[2].form).toBe('show');
    });

    it('inserts after LAST occurrence when word appears multiple times', () => {
      const word = makeWordMeta({ form: 'write' });
      const state: IterateState = {
        wordQueue: [
          word,
          makeWordMeta({ id: 'w2' }),
          makeWordMeta({ id: 'w3' }),
          makeWordMeta({ id: 'w1', form: 'choose_4_def' }), // same word at idx 3
          makeWordMeta({ id: 'w4' }),
        ],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      // findLastIndex → 3, splice at 3+2=5
      expect(result.wordQueue).toHaveLength(6);
      expect(result.wordQueue[5].id).toBe('w1');
      expect(result.wordQueue[5].form).toBe('show');
    });

    it('appends when last occurrence is near end of queue', () => {
      const word = makeWordMeta({ form: 'write' });
      const state: IterateState = { wordQueue: [word], wordIdx: 0 };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      // findLastIndex → 0, splice at 0+2=2 → beyond array, appends
      expect(result.wordQueue).toHaveLength(2);
      expect(result.wordQueue[1].id).toBe('w1');
      expect(result.wordQueue[1].form).toBe('show');
    });

    it('preserves repeated property on review copy', () => {
      const word = makeWordMeta({ form: 'write', repeated: 2 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      expect(result.wordQueue[2].repeated).toBe(2);
    });

    it('sets repeatAgain based on new memLevel', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 5 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: false,
      });
      // memLevel drops to 1
      expect(result.wordQueue[2].repeatAgain).toEqual(
        new Date(FROZEN_NOW_MS + 1 * DAY_MS),
      );
    });

    it('does not modify the original word at wordIdx', () => {
      const word = makeWordMeta({ form: 'write', memLevel: 5 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: false,
        isShortenOnly: false,
      });
      // Original word at position 0 is unchanged
      expect(result.wordQueue[0].form).toBe('write');
      expect(result.wordQueue[0].memLevel).toBe(5);
    });

    it('advances wordIdx by 1', () => {
      const word = makeWordMeta({ form: 'write' });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleMistake(state, word, {
        isLearning: true,
        isShortenOnly: false,
      });
      expect(result.wordIdx).toBe(1);
    });
  });

  // ── handleSkipWord ───────────────────────────────────────────────────
  describe('handleSkipWord', () => {
    it('marks current word as skipped', () => {
      const word = makeWordMeta({ id: 'w1' });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleSkipWord(state, word);
      expect(result.wordQueue[0].isSkipped).toBe(true);
    });

    it('removes future occurrences of the same word', () => {
      const word = makeWordMeta({ id: 'w1' });
      const state: IterateState = {
        wordQueue: [
          word,
          makeWordMeta({ id: 'w2' }),
          makeWordMeta({ id: 'w1', form: 'write' }),
          makeWordMeta({ id: 'w3' }),
        ],
        wordIdx: 0,
      };
      const result = handleSkipWord(state, word);
      expect(result.wordQueue.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
      expect(result.wordQueue).toHaveLength(3);
    });

    it('preserves words before current position', () => {
      const state: IterateState = {
        wordQueue: [
          makeWordMeta({ id: 'w1' }),
          makeWordMeta({ id: 'w2' }),
          makeWordMeta({ id: 'w3' }),
          makeWordMeta({ id: 'w2', form: 'write' }),
        ],
        wordIdx: 1,
      };
      const result = handleSkipWord(state, state.wordQueue[1]);
      expect(result.wordQueue[0].id).toBe('w1'); // preserved unchanged
      expect(result.wordQueue[0].isSkipped).toBe(false);
      expect(result.wordQueue[1].id).toBe('w2');
      expect(result.wordQueue[1].isSkipped).toBe(true);
      expect(result.wordQueue.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
    });

    it('handles word with no future occurrences', () => {
      const state: IterateState = {
        wordQueue: [makeWordMeta({ id: 'w1' }), makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleSkipWord(state, state.wordQueue[0]);
      expect(result.wordQueue).toHaveLength(2);
      expect(result.wordQueue[0].isSkipped).toBe(true);
    });

    it('removes ALL future occurrences of the same word ID', () => {
      const state: IterateState = {
        wordQueue: [
          makeWordMeta({ id: 'w1', form: 'show' }),
          makeWordMeta({ id: 'w1', form: 'write' }),
          makeWordMeta({ id: 'w1', form: 'choose_4_def' }),
        ],
        wordIdx: 0,
      };
      const result = handleSkipWord(state, state.wordQueue[0]);
      expect(result.wordQueue).toHaveLength(1);
      expect(result.wordQueue[0].isSkipped).toBe(true);
      expect(result.wordIdx).toBe(1);
    });

    it('does not mutate the original word object', () => {
      const word = makeWordMeta({ id: 'w1' });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      handleSkipWord(state, word);
      expect(word.isSkipped).toBe(false);
    });

    it('advances wordIdx by 1', () => {
      const state: IterateState = {
        wordQueue: [makeWordMeta({ id: 'w1' }), makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };
      const result = handleSkipWord(state, state.wordQueue[0]);
      expect(result.wordIdx).toBe(1);
    });
  });

  // ── handleOnChange ───────────────────────────────────────────────────
  describe('handleOnChange', () => {
    it('updates word, definition, memLevel, isPriority', () => {
      const queue = [
        makeWordMeta({ id: 'w1', word: 'hello', memLevel: 5, isPriority: false }),
      ];
      const updated = makeWord({
        id: 'w1',
        word: 'hi',
        definition: 'oi',
        memLevel: 3,
        isPriority: true,
      });
      const result = handleOnChange(queue, updated);
      expect(result[0].word).toBe('hi');
      expect(result[0].definition).toBe('oi');
      expect(result[0].memLevel).toBe(3);
      expect(result[0].isPriority).toBe(true);
    });

    it('updates ALL occurrences with the same id', () => {
      const queue = [
        makeWordMeta({ id: 'w1', word: 'hello', form: 'show' }),
        makeWordMeta({ id: 'w2', word: 'world' }),
        makeWordMeta({ id: 'w1', word: 'hello', form: 'write' }),
      ];
      const updated = makeWord({ id: 'w1', word: 'hi', memLevel: 3 });
      const result = handleOnChange(queue, updated);
      expect(result[0].word).toBe('hi');
      expect(result[0].memLevel).toBe(3);
      expect(result[2].word).toBe('hi');
      expect(result[2].memLevel).toBe(3);
    });

    it('preserves repeated meta property', () => {
      const queue = [makeWordMeta({ id: 'w1', repeated: 2 })];
      const updated = makeWord({ id: 'w1', word: 'hi' });
      const result = handleOnChange(queue, updated);
      expect(result[0].repeated).toBe(2);
    });

    it('preserves form property', () => {
      const queue = [makeWordMeta({ id: 'w1', form: 'write' })];
      const updated = makeWord({ id: 'w1', word: 'hi', form: 'show' });
      const result = handleOnChange(queue, updated);
      // form should come from the spread of original (w), not the update
      expect(result[0].form).toBe('write');
    });

    it('does not modify unrelated words', () => {
      const queue = [
        makeWordMeta({ id: 'w1', word: 'hello' }),
        makeWordMeta({ id: 'w2', word: 'world' }),
      ];
      const updated = makeWord({ id: 'w1', word: 'hi' });
      const result = handleOnChange(queue, updated);
      expect(result[1].word).toBe('world');
    });

    it('does not mutate original queue items', () => {
      const original = makeWordMeta({ id: 'w1', word: 'hello' });
      const queue = [original];
      const updated = makeWord({ id: 'w1', word: 'hi' });
      handleOnChange(queue, updated);
      expect(original.word).toBe('hello');
    });

    it('returns new array even if nothing matches', () => {
      const queue = [makeWordMeta({ id: 'w1' })];
      const updated = makeWord({ id: 'nonexistent', word: 'hi' });
      const result = handleOnChange(queue, updated);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('hello');
      expect(result).not.toBe(queue);
    });
  });

  // ── integration / multi-step scenarios ──────────────────────────────
  describe('multi-step scenarios', () => {
    it('correct then mistake produces expected queue', () => {
      const w1 = makeWordMeta({ id: 'w1', form: 'show', memLevel: 5 });
      const w2 = makeWordMeta({ id: 'w2', form: 'show' });
      let state: IterateState = { wordQueue: [w1, w2], wordIdx: 0 };

      // Correct on w1: inserts choose_4_word form
      state = handleCorrect(state, w1, {
        isLearning: true,
        repetitionLimit: 3,
        maxDistForRandom: 10,
        randomFn: () => 0,
      });
      // Queue: [w1(show), w2(show), w1(choose_4_word)]
      expect(state.wordQueue).toHaveLength(3);
      expect(state.wordIdx).toBe(1);

      // Mistake on w2: inserts show form after w2's last occurrence
      state = handleMistake(state, state.wordQueue[1], {
        isLearning: true,
        isShortenOnly: false,
      });
      // findLastIndex(w2) → 1, splice at 1+2=3
      // Queue: [w1(show), w2(show), w1(choose_4_word), w2(show-review)]
      expect(state.wordQueue).toHaveLength(4);
      expect(state.wordIdx).toBe(2);
      expect(state.wordQueue[3].id).toBe('w2');
      expect(state.wordQueue[3].form).toBe('show');
    });

    it('skip removes all future copies of the word', () => {
      const w1 = makeWordMeta({ id: 'w1', form: 'show' });
      let state: IterateState = {
        wordQueue: [w1, makeWordMeta({ id: 'w2' })],
        wordIdx: 0,
      };

      // Correct adds a copy
      state = handleCorrect(state, w1, {
        isLearning: true,
        repetitionLimit: 10,
        maxDistForRandom: 10,
        randomFn: () => 0,
      });
      expect(state.wordQueue.filter((w) => w.id === 'w1')).toHaveLength(2);

      // Skip w2 at position 1
      state = handleSkipWord(state, state.wordQueue[state.wordIdx]);
      expect(state.wordQueue.find((w) => w.id === 'w2')?.isSkipped).toBe(true);
    });

    it('batch limit terminates iteration', () => {
      const words = Array.from({ length: 5 }, (_, i) =>
        makeWordMeta({ id: `w${i}`, form: 'show' }),
      );
      const state: IterateState = { wordQueue: words, wordIdx: 3 };
      expect(checkIsDone(state.wordIdx, state.wordQueue.length, 3)).toBe(true);
      expect(checkIsDone(state.wordIdx, state.wordQueue.length, 5)).toBe(false);
    });
  });

  // ── regression: write_mid is test-only ──────────────────────────────
  describe('write_mid is test-flow only', () => {
    const learnOpts = (overrides: Record<string, unknown> = {}) => ({
      isLearning: true,
      repetitionLimit: 3,
      maxDistForRandom: 10,
      randomFn: () => 0,
      ...overrides,
    });

    const testOpts = (overrides: Record<string, unknown> = {}) => ({
      isLearning: false,
      repetitionLimit: 1,
      maxDistForRandom: 10,
      randomFn: () => 0,
      ...overrides,
    });

    it('learning: no form ever transitions to write_mid (within-session branch)', () => {
      for (const form of TEACHING_FORMS) {
        if (form === 'write_last') continue; // write_last goes to update branch
        const word = makeWordMeta({ form, repeated: 0 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, learnOpts({ repetitionLimit: 10 }));
        const inserted = result.wordQueue.find((w, idx) => idx > 0 && w.id === 'w1');
        expect(inserted?.form).not.toBe('write_mid');
      }
    });

    it('test mode: choose_4_def transitions to write_mid', () => {
      const word = makeWordMeta({ form: 'choose_4_def', repeated: 0 });
      const state: IterateState = {
        wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
        wordIdx: 0,
      };
      const result = handleCorrect(state, word, testOpts({ repetitionLimit: 10 }));
      const inserted = result.wordQueue.find((w, idx) => idx > 0 && w.id === 'w1');
      expect(inserted?.form).toBe('write_mid');
    });

    it('learning else-branch (persisting): uses test transitions for next-session setup', () => {
      const word = makeWordMeta({ form: 'choose_4_def', repeated: 5 });
      const state: IterateState = { wordQueue: [word], wordIdx: 0 };
      const result = handleCorrect(state, word, learnOpts({ repetitionLimit: 1 }));
      // The else branch persists for next session (test flow), so write_mid is correct here
      expect(result.wordQueue[0].form).toBe('write_mid');
    });
  });

  // ── regression: getNextForm isTest consistency ────────────────────────
  describe('getNextForm isTest consistency across all call sites', () => {
    it('every form produces a valid transition in both learn and test mode', () => {
      for (const form of TEACHING_FORMS) {
        const learnNext = getNextForm(form, false);
        const testNext = getNextForm(form, true);
        expect(TEACHING_FORMS as readonly string[]).toContain(learnNext);
        expect(TEACHING_FORMS as readonly string[]).toContain(testNext);
      }
    });

    it('handleCorrect produces valid forms for every starting form (test mode)', () => {
      const testOpts2 = {
        isLearning: false,
        repetitionLimit: 10,
        maxDistForRandom: 10,
        randomFn: () => 0,
      };
      for (const form of TEACHING_FORMS) {
        const word = makeWordMeta({ form, repeated: 0 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, testOpts2);
        const inserted = result.wordQueue.find((w, idx) => idx > 0 && w.id === 'w1');
        if (inserted) {
          expect(TEACHING_FORMS as readonly string[]).toContain(inserted.form);
        }
      }
    });

    it('handleCorrect produces valid forms for every starting form (learn mode)', () => {
      const learnOpts2 = {
        isLearning: true,
        repetitionLimit: 10,
        maxDistForRandom: 10,
        randomFn: () => 0,
      };
      for (const form of TEACHING_FORMS) {
        if (form === 'write_last') continue; // different branch
        const word = makeWordMeta({ form, repeated: 0 });
        const state: IterateState = {
          wordQueue: [word, makeWordMeta({ id: 'w2' }), makeWordMeta({ id: 'w3' })],
          wordIdx: 0,
        };
        const result = handleCorrect(state, word, learnOpts2);
        const inserted = result.wordQueue.find((w, idx) => idx > 0 && w.id === 'w1');
        if (inserted) {
          expect(TEACHING_FORMS as readonly string[]).toContain(inserted.form);
        }
      }
    });
  });
});
