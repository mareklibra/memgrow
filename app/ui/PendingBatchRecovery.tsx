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

function loadInitialBatches(): { batches: PendingBatchEntry[]; errors: string[] } {
  if (typeof window === 'undefined') return { batches: [], errors: [] };
  return loadAllPendingBatches();
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function BatchBanner({
  batch,
  onDone,
}: Readonly<{
  batch: PendingBatchEntry;
  onDone: (key: string) => void;
}>) {
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
        setError(`${failedIds.length} word(s) still failed. Try again.`);
      } else {
        clearPendingBatch(batch.key);
        onDone(batch.key);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }, [batch, onDone]);

  const handleDiscard = useCallback(() => {
    clearPendingBatch(batch.key);
    onDone(batch.key);
  }, [batch.key, onDone]);

  const mode = batch.isLearning ? 'Learn' : 'Test';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
      <span className="flex-1">
        <strong>{mode}</strong> session — {batch.words.length} word(s) unsaved (
        {timeAgo(batch.timestamp)})
      </span>
      {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
      <Button
        variant="outlined"
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="min-w-[80px]"
      >
        {saving ? <Spinner className="h-4 w-4 mx-auto" /> : 'Save'}
      </Button>
      <Button variant="text" size="sm" onClick={handleDiscard} disabled={saving}>
        Discard
      </Button>
    </div>
  );
}

export function PendingBatchRecovery() {
  const [initial] = useState(loadInitialBatches);
  const [batches, setBatches] = useState<PendingBatchEntry[]>(initial.batches);
  const loadErrors = initial.errors;

  const handleDone = useCallback((key: string) => {
    setBatches((prev) => prev.filter((b) => b.key !== key));
  }, []);

  if (batches.length === 0 && loadErrors.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-2">
      {loadErrors.map((err) => (
        <div
          key={err}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-200"
        >
          {err}
        </div>
      ))}
      {batches.map((batch) => (
        <BatchBanner key={batch.key} batch={batch} onDone={handleDone} />
      ))}
    </div>
  );
}
