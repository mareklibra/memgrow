import { useEffect, useState } from 'react';
import { Word } from '@/app/lib/definitions';
import { TrashIcon } from '@heroicons/react/24/outline';
import { DeleteExampleResult, GetWordExamplesResult } from '../lib/types';
import { Card, CardBody, List, ListItem, Typography } from '@/app/lib/material-tailwind-compat';

export type WordExamplesProps = {
  word: Word;
  queryExamples: (wordId: string) => Promise<GetWordExamplesResult>;
  deleteExample: (wordId: string, example: string) => Promise<DeleteExampleResult>;
};

export const WordExamples = ({
  word,
  queryExamples,
  deleteExample,
}: Readonly<WordExamplesProps>) => {
  const [examples, setExamples] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || examples.length > 0) {
      return;
    }

    const doItAsync = async () => {
      const result = await queryExamples(word.id);
      if (result.message) {
        setError(result.message);
        return;
      }
      setExamples(result.examples || []);
    };

    doItAsync();
  }, [word.id, queryExamples, open, examples.length]);

  const toggleOpen = () => setOpen(!open);

  const handleDelete = (event: React.MouseEvent, e: string) => {
    event.stopPropagation();
    event.preventDefault();

    const nextExamples = examples.filter((ex) => ex !== e);
    setExamples(nextExamples);
    deleteExample(word.id, e);

    if (nextExamples.length === 0) {
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Card onClick={toggleOpen} className="cursor-pointer" variant="filled">
        <CardBody>
          {open && examples.length === 0 && (
            <Typography>Generating examples...</Typography>
          )}
          {open && examples.length > 0 && (
            <List key={word.id}>
              {examples.map((e) => (
                <ListItem key={e}>
                  <TrashIcon
                    className="min-w-5 w-5"
                    color="light-red"
                    onClick={(event) => handleDelete(event, e)}
                  />
                  &nbsp;{e}
                </ListItem>
              ))}
            </List>
          )}

          {!open && <Typography>&gt;&nbsp;Show examples</Typography>}

          {error && <Typography>Error: {error}</Typography>}
        </CardBody>
      </Card>
    </div>
  );
};
