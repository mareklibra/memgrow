import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Textarea, Typography } from '@material-tailwind/react';
import { parse } from 'csv-parse/sync';

import { Button } from './button';
import { addWordBatch, updateWordProgress } from '../lib/actions';
import { WordToAdd } from '../lib/definitions';
import { DAY_MS } from '../constants';

const getMemLevelFromRepeat = (repeat: number) => {
  if (repeat < 1) {
    return 0;
  }
  if (repeat < 2) {
    return 2;
  }
  if (repeat > 60) {
    return repeat;
  }
  return repeat;
};

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
          throw new Error(
            `The record must have both word and definition: "${JSON.stringify(record)}"`,
          );
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
          });
        }
      }
    } catch (err) {
      setError(JSON.stringify(err));
      return;
    } finally {
      setInProgress(false);
      if (forceDbReload) {
        await forceDbReload();
      }
    }
  }, [courseId, value, delimiter, forceDbReload]);

  return (
    <div className="flex flex-col">
      {error && (
        <Typography variant="small" className="font-semibold text-red-500">
          {error}
        </Typography>
      )}
      <div className={clsx('flex mt-5', className)}>
        <Textarea
          variant="outlined"
          resize
          label="Batch import (CSV)"
          onChange={(event) => setValue(event.target.value)}
          error={!!error}
        />
        <div className="flex flex-col ml-5">
          <Button onClick={handleImport} type="button" disabled={!value || inProgress}>
            Import
          </Button>
        </div>
      </div>
      <Typography variant="small" className="font-semibold">
        Format: [WORD]{delimiter}[DEFINITION]{delimiter}[NEXT_REPEAT_IN_DAYS]\n
      </Typography>
    </div>
  );
};
