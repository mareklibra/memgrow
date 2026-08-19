import { MouseEvent, useEffect, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { Word } from '@/app/lib/definitions';

import { Button } from './button';
import { CONFIRM_DELAY_MS } from '../constants';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

interface DeleteButtonProps {
  word: Word;
  handleDelete: (e: MouseEvent) => void;
}

export function DeleteButton({ handleDelete }: DeleteButtonProps) {
  const [level, setLevel] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (level === 1) {
      const timeout = setTimeout(() => {
        setLevel(2);
      }, CONFIRM_DELAY_MS);

      return () => clearTimeout(timeout);
    }
  }, [level]);

  if (level === 0) {
    return (
      <Button variant="danger" onClick={() => setLevel(1)}>
        <TrashIcon className="w-5" />
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setLevel(0)}>{t('common.dismiss')}</Button>
      <Button disabled={level !== 2} variant="danger" onClick={handleDelete}>
        {t('common.yes')}
      </Button>
    </>
  );
}
