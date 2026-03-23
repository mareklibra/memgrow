'use client';

import { useState } from 'react';
import { Button } from '@/app/ui/button';
import ConfirmationDialog from '@/app/ui/ConfirmationDialog';
import { autoLearnWords } from '@/app/lib/actions';
import type { UpdateWordsResult } from '@/app/lib/types';
import { cn, s } from './styles';

export function AutoLearnButton({
  courseId,
  toLearnCount,
  className,
}: {
  courseId: string;
  toLearnCount: number;
  className?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<UpdateWordsResult>(undefined);

  const handleConfirm = async () => {
    setResult(undefined);
    const res = await autoLearnWords(courseId);
    setResult(res);
  };

  return (
    <div className={cn(s.inlineActions, className)}>
      <Button onClick={() => setDialogOpen(true)} disabled={toLearnCount === 0}>
        Auto learn ({toLearnCount})
      </Button>
      {result?.message && (
        <span className={result.failedWordIds?.length ? s.errorText : s.successText}>
          {result.message}
        </span>
      )}
      <ConfirmationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
        title="Auto Learn"
        message={`Auto-learn ${toLearnCount} words with random progress levels and evenly spaced review dates over the next month?`}
        confirmText="Auto Learn"
        variant="info"
      />
    </div>
  );
}
