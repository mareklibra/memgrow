'use client';

import { Input } from '@material-tailwind/react';
import { Button } from './button';
import { useState } from 'react';
import { Course, WordToAdd } from '../lib/definitions';
import { UpdateWordResult } from '@/app/lib/types';
import { SuggestTranslationProps, SuggestTranslationResult } from '../lib/types';

export function FastEntryForm({
  addWord,
  course,
  queryTranslations,
}: {
  addWord: (word: WordToAdd) => Promise<UpdateWordResult | undefined>;
  course: Course;
  queryTranslations: (args: SuggestTranslationProps) => Promise<SuggestTranslationResult>;
}) {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = async () => {
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
  };

  const handleSuggestTranslation = async () => {
    setIsLoading(true);
    try {
      const result = await queryTranslations({ word, courseId: course.id });
      if (result?.message) {
        setError(result.message);
      } else {
        setDefinition(result?.translations?.join(', ') || '');
      }
    } finally {
      setIsLoading(false);
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
        <Button className="w-fit" disabled={!word && !definition} onClick={handleClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
