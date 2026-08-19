'use client';

import { useState } from 'react';
import { Button } from '@/app/ui/button';
import ConfirmationDialog from '@/app/ui/ConfirmationDialog';
import { autoLearnWords } from '@/app/lib/actions';
import type { UpdateWordsResult } from '@/app/lib/types';
import { cn, s } from './styles';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

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
  const { t } = useTranslation();

  const handleConfirm = async () => {
    setResult(undefined);
    const res = await autoLearnWords(courseId);
    setResult(res);
  };

  return (
    <div className={cn(s.inlineActions, className)}>
      <Button onClick={() => setDialogOpen(true)} disabled={toLearnCount === 0}>
        {t('edit.autoLearnCount', { count: toLearnCount })}
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
        title={t('edit.autoLearn')}
        message={t('edit.autoLearnConfirm', { count: toLearnCount })}
        confirmText={t('edit.autoLearn')}
        variant="info"
      />
    </div>
  );
}
