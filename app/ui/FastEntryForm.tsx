'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  List,
  ListItem,
  Typography,
} from '@/app/lib/material-tailwind-compat';
import {
  queryTranslations,
  queryReverseTranslation,
  queryExamplesRaw,
} from '@/app/lib/actions';
import { s } from '@/app/ui/styles';
import { Button } from './button';
import { Course, Word, WordToAdd } from '../lib/definitions';
import { UpdateWordResult, WordWithSimilarity } from '@/app/lib/types';
import { getWordSimilarities } from '../lib/utils';

export function FastEntryForm({
  allWords,
  addWord,
  course,
}: {
  allWords: Word[];
  addWord: (word: WordToAdd) => Promise<UpdateWordResult | undefined>;
  course: Course;
}) {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [examples, setExamples] = useState<string[]>([]);
  const [similarities, setSimilarities] = useState<WordWithSimilarity[]>([]);

  useEffect(() => {
    setSimilarities(
      getWordSimilarities(allWords, {
        id: 'unknownId',
        word,
      }),
    );
  }, [allWords, word]);

  const handleAdd = async () => {
    setError(undefined);
    const result = await addWord({
      word,
      definition,
      courseId: course.id,
    });
    if (result?.message) {
      setError(result.message);
    } else {
      setWord('');
      setDefinition('');
    }
  };

  const handleClear = () => {
    setWord('');
    setDefinition('');
    setExamples([]);
    setSimilarities([]);
    setError(undefined);
  };

  const handleSuggestTranslation = async () => {
    setError(undefined);
    setIsLoading(true);
    try {
      const result = await queryTranslations({ word, courseId: course.id });
      if (result?.message) {
        setError(result.message);
      } else {
        setDefinition(result?.translations?.join(', ') || '');
      }
    } catch (e) {
      setError(`Error in queryTranslations: ${JSON.stringify(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    setError(undefined);
    setIsLoading(true);
    try {
      const result = await queryReverseTranslation({
        word: definition,
        courseId: course.id,
      });
      if (result?.message) {
        setError(result.message);
      } else {
        setWord(result?.translations?.join(', ') || '');
      }
    } catch (e) {
      setError(`Error in queryReverseTranslation: ${JSON.stringify(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExamples = async () => {
    const result = await queryExamplesRaw({ word, courseId: course.id });
    if (result?.message) {
      setError(result.message);
    } else {
      setExamples(result?.examples || []);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-end gap-2">
        <div className="flex-1">
          <Input
            label={`Word (${course.learningLang})`}
            size="lg"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            autoCapitalize="none"
          />
        </div>
        <Button
          className="w-fit shrink-0"
          disabled={!word}
          onClick={handleSuggestTranslation}
        >
          Suggest
        </Button>
      </div>

      <div className="flex flex-row items-end gap-2">
        <div className="flex-1">
          <Input
            label={`Definition (${course.knownLang})`}
            size="lg"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            autoCapitalize="none"
          />
        </div>
        <Button
          className="w-fit shrink-0"
          disabled={!definition || isLoading}
          onClick={handleTranslate}
        >
          Translate
        </Button>
      </div>

      {error && <p className={s.errorText}>{error}</p>}
      {word && (
        <div className="flex flex-row gap-2 text-sm text-gray-600">
          Similarity:{' '}
          {similarities
            .slice(0, 3)
            .map((s) => `${s.word} (${s.similarity.toFixed(2)})`)
            .join(', ')}
        </div>
      )}

      <Button
        className="w-full justify-center"
        disabled={!word || !definition}
        onClick={handleAdd}
      >
        Add Word
      </Button>

      <div className="flex flex-row justify-between items-center">
        <Button className="w-fit" onClick={handleGenerateExamples} disabled={!word}>
          Generate examples
        </Button>
        <Button
          className="w-fit bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100"
          disabled={!word && !definition}
          onClick={handleClear}
        >
          Clear
        </Button>
      </div>

      {examples?.length > 0 && (
        <Card>
          <CardBody>
            <Typography variant="h5" color="blue-gray" className="mb-2">
              Examples
            </Typography>
            <Typography>
              <List>
                {examples.map((e) => (
                  <ListItem key={e}>{e}</ListItem>
                ))}
              </List>
            </Typography>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
