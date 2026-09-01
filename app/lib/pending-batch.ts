import { Word } from '@/app/lib/definitions';

export type PendingBatch = {
  words: Word[];
  courseId: string;
  isLearning: boolean;
  timestamp: number;
};

export type PendingBatchEntry = PendingBatch & { key: string };

export type PendingBatchesSnapshot = {
  batches: PendingBatchEntry[];
  hadAccessError: boolean;
};

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

/** Returns true on success. */
export function savePendingBatch(batch: PendingBatch): boolean {
  const key = getBatchKey(batch.courseId, batch.isLearning);
  const payload: PendingBatch = {
    ...batch,
    words: batch.words.map(stripForStorage) as Word[],
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save progress backup:', e);
    return false;
  }
  afterMutation();
  return true;
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
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Failed to load progress backup:', msg);
    return null;
  }
}

export function clearPendingBatch(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear pending batch from localStorage:', e);
  }
  afterMutation();
}

/** Returns all valid pending batches and an array of errors for any that failed to load. */
export function loadAllPendingBatches(): PendingBatchesSnapshot {
  const batches: PendingBatchEntry[] = [];
  let hadAccessError = false;
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
    console.error('Failed to access localStorage:', e);
    hadAccessError = true;
  }
  return { batches, hadAccessError };
}

const EMPTY_SNAPSHOT: PendingBatchesSnapshot = {
  batches: [],
  hadAccessError: false,
};

let snapshot: PendingBatchesSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();
let storageListenerAttached = false;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function afterMutation(): void {
  refreshPendingBatchesSnapshot();
  emit();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && !event.key.startsWith(STORAGE_PREFIX)) return;
  refreshPendingBatchesSnapshot();
  emit();
}

export function refreshPendingBatchesSnapshot(): PendingBatchesSnapshot {
  snapshot = loadAllPendingBatches();
  return snapshot;
}

export function getPendingBatchesSnapshot(): PendingBatchesSnapshot {
  return snapshot;
}

export function getPendingBatchesServerSnapshot(): PendingBatchesSnapshot {
  return EMPTY_SNAPSHOT;
}

export function subscribePendingBatches(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    if (!storageListenerAttached) {
      window.addEventListener('storage', onStorage);
      storageListenerAttached = true;
    }
    refreshPendingBatchesSnapshot();
  }
  return () => {
    listeners.delete(onStoreChange);
    if (
      listeners.size === 0 &&
      storageListenerAttached &&
      typeof window !== 'undefined'
    ) {
      window.removeEventListener('storage', onStorage);
      storageListenerAttached = false;
    }
  };
}
