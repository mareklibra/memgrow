import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Word } from '@/app/lib/definitions';
import {
  getBatchKey,
  savePendingBatch,
  loadPendingBatch,
  clearPendingBatch,
  loadAllPendingBatches,
  refreshPendingBatchesSnapshot,
  getPendingBatchesSnapshot,
  getPendingBatchesServerSnapshot,
  subscribePendingBatches,
  PendingBatch,
} from '@/app/lib/pending-batch';

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 'w1',
    courseId: 'c1',
    word: 'hello',
    definition: 'hola',
    memLevel: 5,
    form: 'show',
    repeatAgain: new Date('2025-01-15T10:30:00Z'),
    isPriority: false,
    isSkipped: false,
    ...overrides,
  };
}

function makeBatch(overrides: Partial<PendingBatch> = {}): PendingBatch {
  return {
    words: [makeWord()],
    courseId: 'c1',
    isLearning: true,
    timestamp: 1700000000000,
    ...overrides,
  };
}

// localStorage mock
const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
};

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', localStorageMock);
  refreshPendingBatchesSnapshot();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getBatchKey', () => {
  it('returns learn key for isLearning=true', () => {
    expect(getBatchKey('course-42', true)).toBe('memgrow_pending_batch_course-42_learn');
  });

  it('returns test key for isLearning=false', () => {
    expect(getBatchKey('course-42', false)).toBe('memgrow_pending_batch_course-42_test');
  });
});

describe('savePendingBatch', () => {
  it('saves a batch and returns true on success', () => {
    const result = savePendingBatch(makeBatch());
    expect(result).toBe(true);
    expect(storage.size).toBe(1);

    const key = getBatchKey('c1', true);
    const stored = JSON.parse(storage.get(key)!);
    expect(stored.courseId).toBe('c1');
    expect(stored.isLearning).toBe(true);
    expect(stored.words).toHaveLength(1);
    expect(stored.words[0].id).toBe('w1');
  });

  it('strips similarWords before saving', () => {
    const similar = makeWord({ id: 'sim1', word: 'hi' });
    const word = makeWord({ similarWords: [similar] });
    savePendingBatch(makeBatch({ words: [word] }));

    const key = getBatchKey('c1', true);
    const stored = JSON.parse(storage.get(key)!);
    expect(stored.words[0].similarWords).toBeUndefined();
  });

  it('serializes Date as ISO string', () => {
    savePendingBatch(makeBatch());
    const key = getBatchKey('c1', true);
    const stored = JSON.parse(storage.get(key)!);
    expect(stored.words[0].repeatAgain).toBe('2025-01-15T10:30:00.000Z');
  });

  it('returns false when localStorage throws', () => {
    const original = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    const result = savePendingBatch(makeBatch());
    expect(result).toBe(false);

    localStorageMock.setItem = original;
  });

  it('saves multiple batches with different keys', () => {
    savePendingBatch(makeBatch({ courseId: 'c1', isLearning: true }));
    savePendingBatch(makeBatch({ courseId: 'c1', isLearning: false }));
    savePendingBatch(makeBatch({ courseId: 'c2', isLearning: true }));

    expect(storage.size).toBe(3);
  });

  it('overwrites existing batch for same course+mode', () => {
    const w1 = makeWord({ id: 'w1' });
    const w2 = makeWord({ id: 'w2' });
    savePendingBatch(makeBatch({ words: [w1, w2] }));
    savePendingBatch(makeBatch({ words: [w2] }));

    const key = getBatchKey('c1', true);
    const stored = JSON.parse(storage.get(key)!);
    expect(stored.words).toHaveLength(1);
    expect(stored.words[0].id).toBe('w2');
  });
});

describe('loadPendingBatch', () => {
  it('returns null for missing key', () => {
    expect(loadPendingBatch('nonexistent')).toBeNull();
  });

  it('loads and deserializes a saved batch', () => {
    savePendingBatch(makeBatch());
    const key = getBatchKey('c1', true);

    const loaded = loadPendingBatch(key);
    expect(loaded).not.toBeNull();
    expect(loaded!.courseId).toBe('c1');
    expect(loaded!.isLearning).toBe(true);
    expect(loaded!.key).toBe(key);
    expect(loaded!.words).toHaveLength(1);
    expect(loaded!.words[0].repeatAgain).toBeInstanceOf(Date);
    expect(loaded!.words[0].repeatAgain.toISOString()).toBe('2025-01-15T10:30:00.000Z');
  });

  it('returns null for corrupt JSON', () => {
    const key = getBatchKey('c1', true);
    storage.set(key, '{invalid json!!!');
    expect(loadPendingBatch(key)).toBeNull();
  });

  it('preserves all word fields through save/load roundtrip', () => {
    const word = makeWord({
      id: 'w99',
      courseId: 'c1',
      word: 'test',
      definition: 'prueba',
      memLevel: 12,
      form: 'write',
      repeatAgain: new Date('2025-06-01T08:00:00Z'),
      isPriority: true,
      isSkipped: true,
    });
    savePendingBatch(makeBatch({ words: [word] }));
    const key = getBatchKey('c1', true);
    const loaded = loadPendingBatch(key)!;
    const w = loaded.words[0];

    expect(w.id).toBe('w99');
    expect(w.word).toBe('test');
    expect(w.definition).toBe('prueba');
    expect(w.memLevel).toBe(12);
    expect(w.form).toBe('write');
    expect(w.isPriority).toBe(true);
    expect(w.isSkipped).toBe(true);
    expect(w.repeatAgain.toISOString()).toBe('2025-06-01T08:00:00.000Z');
  });
});

describe('clearPendingBatch', () => {
  it('removes a saved batch', () => {
    savePendingBatch(makeBatch());
    const key = getBatchKey('c1', true);
    expect(storage.has(key)).toBe(true);

    clearPendingBatch(key);
    expect(storage.has(key)).toBe(false);
  });

  it('does not throw for missing key', () => {
    expect(() => clearPendingBatch('nonexistent')).not.toThrow();
  });
});

describe('loadAllPendingBatches', () => {
  it('returns empty when no batches exist', () => {
    const { batches, hadAccessError } = loadAllPendingBatches();
    expect(batches).toEqual([]);
    expect(hadAccessError).toBe(false);
  });

  it('ignores non-memgrow localStorage keys', () => {
    storage.set('unrelated_key', 'value');
    storage.set('memgrow_something_else', 'value');
    const { batches } = loadAllPendingBatches();
    expect(batches).toEqual([]);
  });

  it('returns all saved batches', () => {
    savePendingBatch(
      makeBatch({
        courseId: 'c1',
        isLearning: true,
        words: [makeWord({ id: 'w1' })],
      }),
    );
    savePendingBatch(
      makeBatch({
        courseId: 'c1',
        isLearning: false,
        words: [makeWord({ id: 'w2' })],
      }),
    );
    savePendingBatch(
      makeBatch({
        courseId: 'c2',
        isLearning: true,
        words: [makeWord({ id: 'w3' })],
      }),
    );

    const { batches, hadAccessError } = loadAllPendingBatches();
    expect(hadAccessError).toBe(false);
    expect(batches).toHaveLength(3);

    const keys = batches.map((b) => b.key).sort();
    expect(keys).toEqual([
      'memgrow_pending_batch_c1_learn',
      'memgrow_pending_batch_c1_test',
      'memgrow_pending_batch_c2_learn',
    ]);
  });

  it('skips batches with empty words array', () => {
    savePendingBatch(makeBatch({ words: [] }));
    const { batches } = loadAllPendingBatches();
    expect(batches).toEqual([]);
  });

  it('skips corrupt entries without failing on valid ones', () => {
    savePendingBatch(makeBatch({ courseId: 'good', isLearning: true }));

    const corruptKey = 'memgrow_pending_batch_bad_test';
    storage.set(corruptKey, '{not valid json');

    const { batches } = loadAllPendingBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0].courseId).toBe('good');
  });

  it('returns multiple words per batch', () => {
    const words = [
      makeWord({ id: 'w1', word: 'hello' }),
      makeWord({ id: 'w2', word: 'world' }),
      makeWord({ id: 'w3', word: 'foo' }),
    ];
    savePendingBatch(makeBatch({ words }));

    const { batches } = loadAllPendingBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0].words).toHaveLength(3);
    expect(batches[0].words.map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
  });
});

describe('pending-batch snapshot store', () => {
  it('returns the same snapshot object until a mutation', () => {
    const first = getPendingBatchesSnapshot();
    expect(getPendingBatchesSnapshot()).toBe(first);

    savePendingBatch(makeBatch());
    const afterSave = getPendingBatchesSnapshot();
    expect(afterSave).not.toBe(first);
    expect(afterSave.batches).toHaveLength(1);
    expect(getPendingBatchesSnapshot()).toBe(afterSave);
  });

  it('notifies subscribers on save and clear', () => {
    const listener = vi.fn();
    const unsub = subscribePendingBatches(listener);
    expect(listener).not.toHaveBeenCalled();

    savePendingBatch(makeBatch());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getPendingBatchesSnapshot().batches).toHaveLength(1);

    clearPendingBatch(getBatchKey('c1', true));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getPendingBatchesSnapshot().batches).toHaveLength(0);
    unsub();
  });

  it('does not notify or change the snapshot when save fails', () => {
    const listener = vi.fn();
    const unsub = subscribePendingBatches(listener);
    const original = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    const before = getPendingBatchesSnapshot();
    expect(savePendingBatch(makeBatch())).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(getPendingBatchesSnapshot()).toBe(before);

    localStorageMock.setItem = original;
    unsub();
  });

  it('getPendingBatchesServerSnapshot is a stable empty snapshot', () => {
    savePendingBatch(makeBatch());
    const server = getPendingBatchesServerSnapshot();
    expect(server).toBe(getPendingBatchesServerSnapshot());
    expect(server.batches).toEqual([]);
    expect(server.hadAccessError).toBe(false);
    expect(getPendingBatchesSnapshot().batches).toHaveLength(1);
  });
});
