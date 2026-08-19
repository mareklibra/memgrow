'use client';

import { useCallback, useState } from 'react';
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

function BatchBanner({
  batch,
  onDone,
}: Readonly<{
  batch: PendingBatchEntry;
  onDone: (key: string) => void;
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
        onDone(batch.key);
      }
    } catch {
      setError(t('pending.networkError'));
    } finally {
      setSaving(false);
    }
  }, [batch, onDone, t]);

  const handleDiscard = useCallback(() => {
    clearPendingBatch(batch.key);
    onDone(batch.key);
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
  const [initial] = useState(loadInitialBatches);
  const [batches, setBatches] = useState<PendingBatchEntry[]>(initial.batches);
  const hadAccessError = initial.hadAccessError;

  const handleDone = useCallback((key: string) => {
    setBatches((prev) => prev.filter((b) => b.key !== key));
  }, []);

  if (batches.length === 0 && !hadAccessError) return null;

  return (
    <div className="flex flex-col gap-2 p-2">
      {hadAccessError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-200">
          {t('errors.localStorageAccess')}
        </div>
      )}
      {batches.map((batch) => (
        <BatchBanner key={batch.key} batch={batch} onDone={handleDone} />
      ))}
    </div>
  );
}
