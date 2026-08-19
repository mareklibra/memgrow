import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Textarea, Typography } from '@/app/lib/material-tailwind-compat';
import { parse } from 'csv-parse/sync';

import { Button } from './button';
import { addWordBatch, updateWordProgress } from '../lib/actions';
import { WordToAdd } from '../lib/definitions';
import { DAY_MS } from '../constants';
import { getMemLevelFromRepeat } from '../lib/utils';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

export const BatchImport = ({
  className,
  courseId,
  forceDbReload,
}: {
  className?: string;
  courseId: string;
  forceDbReload?: () => Promise<void>;
}) => {
  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string>();
  const delimiter = ',';
  const [inProgress, setInProgress] = useState(false);
  const { t } = useTranslation();

  const handleImport = useCallback(async () => {
    setError(undefined);
    setInProgress(true);

    let records: { word: string; definition: string; repeat?: string }[];
    try {
      records = parse(`word${delimiter}definition${delimiter}repeat\n${value}`, {
        columns: true,
        skip_empty_lines: true,
        delimiter,
        trim: true,
      });

      const words: WordToAdd[] = records.map((record) => {
        if (!record.word || !record.definition) {
          throw new Error(t('edit.csvMissingFields'));
        }

        let repeat = -1;
        if (record.repeat === 'now') {
          repeat = 0;
        } else if (record.repeat !== undefined) {
          const numeric: number = parseInt(record.repeat);
          if (!isNaN(numeric)) {
            repeat = numeric;
          }
        }

        return {
          ...record,
          courseId,
          repeat,
        };
      });

      const results = await addWordBatch(words);
      const errors = results.map((r) => r?.message).filter(Boolean);
      if (errors.length > 0) {
        setError(errors.join('; '));
      }

      for (let idx = 0; idx < results.length; idx++) {
        const result = results[idx];
        if (!result?.id) {
          return;
        }

        const word = words[idx];
        if (word?.repeat !== undefined && word.repeat > 0) {
          // Either switch to a batch-mode or issue queries one-by-one
          await updateWordProgress({
            courseId,
            id: result.id,
            form: 'choose_4_def',
            memLevel: getMemLevelFromRepeat(word.repeat),
            repeatAgain: new Date(Date.now() + DAY_MS * word.repeat),
            word: 'not_relevant',
            definition: 'not_relevant',
            isPriority: false,
            isSkipped: false,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
      return;
    } finally {
      setInProgress(false);
      if (forceDbReload) {
        await forceDbReload();
      }
    }
  }, [courseId, value, delimiter, forceDbReload, t]);

  return (
    <div className="flex flex-col">
      {error && (
        <Typography variant="small" className="font-semibold text-danger">
          {error}
        </Typography>
      )}
      <div className={clsx('flex mt-5', className)}>
        <Textarea
          variant="outlined"
          resize
          label={t('edit.batchImport')}
          onChange={(event) => setValue(event.target.value)}
          error={!!error}
        />
        <div className="flex flex-col ml-5">
          <Button onClick={handleImport} type="button" disabled={!value || inProgress}>
            {t('common.import')}
          </Button>
        </div>
      </div>
      <Typography variant="small" className="font-semibold">
        {t('edit.csvFormat')}
      </Typography>
    </div>
  );
};
