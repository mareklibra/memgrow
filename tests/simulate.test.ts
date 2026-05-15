import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runSimulation,
  SIMULATION_DAYS,
  SimulationWord,
  TimeSlot,
} from '@/app/lib/simulate';
import { DAY_MS } from '@/app/constants';

const FROZEN_NOW = new Date('2025-06-10T00:00:00Z');

function makeSlot(overrides: Partial<TimeSlot> = {}): TimeSlot {
  return { id: 1, hour: 8, minute: 0, wordCount: 10, ...overrides };
}

function makeWord(overrides: Partial<SimulationWord> = {}): SimulationWord {
  return {
    memLevel: 3,
    repeatAgain: new Date('2025-06-09T00:00:00Z').toISOString(), // already due
    ...overrides,
  };
}

describe('runSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: FROZEN_NOW });
    // Fix increaseMemLevel randomness: always increase by 1 for levels below threshold
    // (threshold = TeachingFormCount * 2 = 14), which covers typical test ranges
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns exactly SIMULATION_DAYS results', () => {
    const results = runSimulation([makeWord()], [makeSlot()]);
    expect(results).toHaveLength(SIMULATION_DAYS);
  });

  it('returns empty slots when no words are provided', () => {
    const results = runSimulation([], [makeSlot()]);
    expect(results).toHaveLength(SIMULATION_DAYS);
    results.forEach((day) => {
      expect(day.slots[0].dueBefore).toBe(0);
      expect(day.slots[0].processed).toBe(0);
      expect(day.remainingAtEnd).toBe(0);
    });
  });

  it('processes due words in the first slot', () => {
    const word = makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' });
    const results = runSimulation([word], [makeSlot({ wordCount: 10 })]);
    expect(results[0].slots[0].dueBefore).toBe(1);
    expect(results[0].slots[0].processed).toBe(1);
  });

  it('does not process words that are not yet due', () => {
    const futureWord = makeWord({
      memLevel: 5,
      repeatAgain: new Date(FROZEN_NOW.getTime() + 30 * DAY_MS).toISOString(),
    });
    const results = runSimulation([futureWord], [makeSlot()]);
    expect(results[0].slots[0].dueBefore).toBe(0);
    expect(results[0].slots[0].processed).toBe(0);
  });

  it('limits processing to slot wordCount', () => {
    const words = Array.from({ length: 5 }, () =>
      makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' }),
    );
    const results = runSimulation(words, [makeSlot({ wordCount: 3 })]);
    expect(results[0].slots[0].dueBefore).toBe(5);
    expect(results[0].slots[0].processed).toBe(3);
  });

  it('sorts slots by time', () => {
    const slots = [
      makeSlot({ id: 1, hour: 18, minute: 0, wordCount: 5 }),
      makeSlot({ id: 2, hour: 8, minute: 0, wordCount: 5 }),
    ];
    const results = runSimulation([makeWord()], slots);
    expect(results[0].slots[0].time).toBe('08:00');
    expect(results[0].slots[1].time).toBe('18:00');
  });

  it('formats time labels with zero-padding', () => {
    const slots = [makeSlot({ hour: 7, minute: 5 })];
    const results = runSimulation([makeWord()], [slots[0]]);
    expect(results[0].slots[0].time).toBe('07:05');
  });

  it('prioritizes words with lower memLevel when processing', () => {
    const words = [
      makeWord({ memLevel: 10, repeatAgain: '2025-06-09T00:00:00Z' }),
      makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' }),
      makeWord({ memLevel: 5, repeatAgain: '2025-06-09T00:00:00Z' }),
    ];
    const results = runSimulation(words, [makeSlot({ wordCount: 1 })]);
    // Only 1 word processed; the one with memLevel=1 should be chosen
    expect(results[0].slots[0].processed).toBe(1);
    expect(results[0].slots[0].dueBefore).toBe(3);
  });

  it('does not mutate input arrays', () => {
    const words = [makeWord()];
    const slots = [makeSlot()];
    const wordsSnapshot = JSON.parse(JSON.stringify(words));
    const slotsSnapshot = JSON.parse(JSON.stringify(slots));
    runSimulation(words, slots);
    expect(words).toEqual(wordsSnapshot);
    expect(slots).toEqual(slotsSnapshot);
  });

  it('each day has a date starting from today', () => {
    const results = runSimulation([makeWord()], [makeSlot()]);
    const todayStart = new Date(
      FROZEN_NOW.getFullYear(),
      FROZEN_NOW.getMonth(),
      FROZEN_NOW.getDate(),
    ).getTime();
    for (let i = 0; i < SIMULATION_DAYS; i++) {
      expect(results[i].date.getTime()).toBe(todayStart + i * DAY_MS);
    }
  });

  it('after processing, words are rescheduled and do not appear due again immediately', () => {
    const word = makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' });
    const slot = makeSlot({ wordCount: 10, hour: 8 });
    const results = runSimulation([word], [slot]);
    // After processing in day 0, the word should be rescheduled further out.
    // With memLevel=1 → increaseMemLevel(1) = 2 → next due in 2 days from slot time.
    // So on day 1 at 08:00, it should NOT be due yet.
    expect(results[1].slots[0].dueBefore).toBe(0);
  });

  it('handles multiple slots per day correctly', () => {
    const word = makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' });
    const slots = [
      makeSlot({ id: 1, hour: 8, minute: 0, wordCount: 10 }),
      makeSlot({ id: 2, hour: 20, minute: 0, wordCount: 10 }),
    ];
    const results = runSimulation([word], slots);
    // Word is due and processed in first slot
    expect(results[0].slots[0].dueBefore).toBe(1);
    expect(results[0].slots[0].processed).toBe(1);
    // After first slot processes it, second slot should not see it as due
    expect(results[0].slots[1].dueBefore).toBe(0);
  });

  it('remainingAtEnd counts words still due by end of day', () => {
    const words = [
      makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' }),
      makeWord({ memLevel: 1, repeatAgain: '2025-06-09T00:00:00Z' }),
    ];
    // Only process 1 of 2 due words
    const results = runSimulation(words, [makeSlot({ wordCount: 1 })]);
    // 1 word processed and rescheduled; 1 word left unprocessed but still due
    expect(results[0].remainingAtEnd).toBe(1);
  });
});
