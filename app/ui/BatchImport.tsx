import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Textarea, Typography } from '@material-tailwind/react';
import { parse } from 'csv-parse/sync';

import { Button } from './button';
import { addWordBatch } from '../lib/actions';
import { WordToAdd } from '../lib/definitions';

export const BatchImport = ({
  className,
  courseId,
}: {
  className?: string;
  courseId: string;
}) => {
  const [value, setValue] = useState<string>('');
  const [error, setError] = useState<string>();
  const delimiter = ',';
  const [inProgress, setInProgress] = useState(false);

  const handleImport = useCallback(async () => {
    setError(undefined);
    setInProgress(true);

    let records: { word: string; definition: string }[];
    try {
      // TODO: add timestamp for next repeat
      records = parse(`word${delimiter}definition\n${value}`, {
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

        console.log('--- TODO: check for similarity');

        return {
          ...record,
          courseId,
        };
      });

      const results = await addWordBatch(words);
      const errors = results.map((r) => r?.message).filter(Boolean);
      if (errors.length > 0) {
        setError(errors.join('; '));
      }
    } catch (err) {
      setError(JSON.stringify(err));
      return;
    } finally {
      setInProgress(false);
    }
  }, [courseId, value, delimiter]);

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
        Format: [WORD]{delimiter}[DEFINITION]\n
      </Typography>
    </div>
  );
};
