'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Button, Spinner } from '@/app/lib/material-tailwind-compat';
import { updateWordsProgress } from '@/app/lib/actions';
import {
  loadAllPendingBatches,
  clearPendingBatch,
  savePendingBatch,
  type PendingBatchEntry,
} from '@/app/lib/pending-batch';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { formatRelativeTime } from '@/app/lib/i18n/format';

function loadInitialBatches(): {
  batches: PendingBatchEntry[];
  hadAccessError: boolean;
} {
  if (typeof window === 'undefined') return { batches: [], hadAccessError: false };
  return loadAllPendingBatches();
}

export type PendingResolveAction = 'save' | 'discard';

type PendingBatchContextValue = {
  batches: PendingBatchEntry[];
  hadAccessError: boolean;
  claimedKeys: ReadonlySet<string>;
  claim: (key: string) => void;
  unclaim: (key: string) => void;
  removeBatch: (key: string) => void;
  rescan: () => void;
};

const PendingBatchContext = createContext<PendingBatchContextValue | null>(null);

export function PendingBatchProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [initial] = useState(loadInitialBatches);
  const [batches, setBatches] = useState<PendingBatchEntry[]>(initial.batches);
  const [hadAccessError] = useState(initial.hadAccessError);
  const [claimedKeys, setClaimedKeys] = useState<Set<string>>(() => new Set());

  const claim = useCallback((key: string) => {
    setClaimedKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const unclaim = useCallback((key: string) => {
    setClaimedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const removeBatch = useCallback((key: string) => {
    setBatches((prev) => prev.filter((b) => b.key !== key));
  }, []);

  const rescan = useCallback(() => {
    const result = loadAllPendingBatches();
    setBatches(result.batches);
  }, []);

  const value = useMemo(
    () => ({
      batches,
      hadAccessError,
      claimedKeys,
      claim,
      unclaim,
      removeBatch,
      rescan,
    }),
    [batches, hadAccessError, claimedKeys, claim, unclaim, removeBatch, rescan],
  );

  return (
    <PendingBatchContext.Provider value={value}>{children}</PendingBatchContext.Provider>
  );
}

export function usePendingBatchContext(): PendingBatchContextValue {
  const ctx = useContext(PendingBatchContext);
  if (!ctx) {
    throw new Error('usePendingBatchContext must be used within PendingBatchProvider');
  }
  return ctx;
}

export function BatchBanner({
  batch,
  onDone,
}: Readonly<{
  batch: PendingBatchEntry;
  onDone: (key: string, action: PendingResolveAction) => void;
}>) {
  const { t, locale } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateWordsProgress(batch.words);
      const failedIds = result?.failedWordIds ?? [];
      if (failedIds.length > 0) {
        const failedWords = batch.words.filter((w) => failedIds.includes(w.id));
        savePendingBatch({
          words: failedWords,
          courseId: batch.courseId,
          isLearning: batch.isLearning,
          timestamp: batch.timestamp,
        });
        setError(t('pending.stillFailed', { count: failedIds.length }));
      } else {
        clearPendingBatch(batch.key);
        onDone(batch.key, 'save');
      }
    } catch {
      setError(t('pending.networkError'));
    } finally {
      setSaving(false);
    }
  }, [batch, onDone, t]);

  const handleDiscard = useCallback(() => {
    clearPendingBatch(batch.key);
    onDone(batch.key, 'discard');
  }, [batch.key, onDone]);

  const mode = batch.isLearning ? t('learn.title') : t('test.title');

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
      <span className="flex-1">
        {t('pending.sessionUnsaved', {
          mode,
          count: batch.words.length,
          timeAgo: formatRelativeTime(batch.timestamp, locale, t),
        })}
      </span>
      {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
      <Button
        variant="outlined"
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="min-w-[80px]"
      >
        {saving ? <Spinner className="h-4 w-4 mx-auto" /> : t('common.save')}
      </Button>
      <Button variant="text" size="sm" onClick={handleDiscard} disabled={saving}>
        {t('pending.discard')}
      </Button>
    </div>
  );
}

export function PendingBatchRecovery() {
  const { t } = useTranslation();
  const { batches, hadAccessError, claimedKeys, removeBatch } = usePendingBatchContext();

  const handleDone = useCallback(
    (key: string) => {
      removeBatch(key);
    },
    [removeBatch],
  );

  const visible = batches.filter((b) => !claimedKeys.has(b.key));

  if (visible.length === 0 && !hadAccessError) return null;

  return (
    <div className="flex flex-col gap-2 p-2">
      {hadAccessError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-200">
          {t('errors.localStorageAccess')}
        </div>
      )}
      {visible.map((batch) => (
        <BatchBanner key={batch.key} batch={batch} onDone={handleDone} />
      ))}
    </div>
  );
}
