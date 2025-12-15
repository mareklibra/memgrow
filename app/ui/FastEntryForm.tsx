'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  List,
  ListItem,
  Typography,
} from '@material-tailwind/react';
import { queryTranslations, queryExamplesRaw } from '@/app/lib/actions';
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

  const handleGenerateExamples = async () => {
    const result = await queryExamplesRaw({ word, courseId: course.id });
    if (result?.message) {
      setError(result.message);
    } else {
      setExamples(result?.examples || []);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={`Word (${course.learningLang})`}
        size="lg"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        crossOrigin={undefined}
        autoCapitalize="none"
      />
      <Input
        label={`Definition (${course.knownLang})`}
        size="lg"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        crossOrigin={undefined}
        autoCapitalize="none"
      />
      {error && <p className="text-red-500">{error}</p>}
      {word && (
        <div className="flex flex-row gap-2">
          Similarity:{' '}
          {similarities
            .slice(0, 3)
            .map((s) => `${s.word} (${s.similarity.toFixed(2)})`)
            .join(', ')}
        </div>
      )}
      <div className="flex flex-row gap-2">
        <Button className="w-fit" disabled={!word || !definition} onClick={handleAdd}>
          Add
        </Button>
        <Button
          className="w-fit"
          disabled={!word || isLoading}
          onClick={handleSuggestTranslation}
        >
          Suggest translation
        </Button>
        <Button onClick={handleGenerateExamples} disabled={!word}>
          Generate examples
        </Button>
        <Button className="w-fit" disabled={!word && !definition} onClick={handleClear}>
          Clear
        </Button>
      </div>
      {examples?.length > 0 && (
        <div className="flex flex-row gap-2">
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
        </div>
      )}
    </div>
  );
}
