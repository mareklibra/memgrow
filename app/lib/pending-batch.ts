import { Word } from '@/app/lib/definitions';

export type PendingBatch = {
  words: Word[];
  courseId: string;
  isLearning: boolean;
  timestamp: number;
};

export type PendingBatchEntry = PendingBatch & { key: string };

const STORAGE_PREFIX = 'memgrow_pending_batch_';

export function getBatchKey(courseId: string, isLearning: boolean): string {
  return `${STORAGE_PREFIX}${courseId}_${isLearning ? 'learn' : 'test'}`;
}

function stripForStorage(word: Word): Omit<Word, 'similarWords'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { similarWords, ...rest } = word;
  return rest;
}

function deserializeWord(raw: Record<string, unknown>): Word {
  return {
    ...raw,
    repeatAgain: new Date(raw.repeatAgain as string),
  } as Word;
}

/** Returns an error message on failure, or undefined on success. */
export function savePendingBatch(batch: PendingBatch): string | undefined {
  const key = getBatchKey(batch.courseId, batch.isLearning);
  const payload: PendingBatch = {
    ...batch,
    words: batch.words.map(stripForStorage) as Word[],
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    const msg = `Failed to save progress backup: ${e instanceof Error ? e.message : e}`;
    console.error(msg);
    return msg;
  }
  return undefined;
}

/** Returns the batch entry, or null if not found / parse error. */
export function loadPendingBatch(key: string): PendingBatchEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBatch;
    return {
      ...parsed,
      words: parsed.words.map(deserializeWord),
      key,
    };
  } catch (e) {
    const msg = `Failed to load progress backup: ${e instanceof Error ? e.message : e}`;
    console.error(msg);
    return null;
  }
}

export function clearPendingBatch(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear pending batch from localStorage:', e);
  }
}

/** Returns all valid pending batches and an array of errors for any that failed to load. */
export function loadAllPendingBatches(): {
  batches: PendingBatchEntry[];
  errors: string[];
} {
  const batches: PendingBatchEntry[] = [];
  const errors: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const batch = loadPendingBatch(key);
        if (batch && batch.words.length > 0) {
          batches.push(batch);
        }
      }
    }
  } catch (e) {
    errors.push(`Failed to access localStorage: ${e instanceof Error ? e.message : e}`);
  }
  return { batches, errors };
}
