'use client';

import { Input } from '@material-tailwind/react';
import { Button } from './button';
import { useState } from 'react';
import { Course, WordToAdd } from '../lib/definitions';
import { UpdateWordResult } from '../lib/actions';

export function FastEntryForm({
  addWord,
  course,
}: {
  addWord: (word: WordToAdd) => Promise<UpdateWordResult | undefined>;
  course: Course;
}) {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

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
      <Button className="w-fit" disabled={!word || !definition} onClick={handleAdd}>
        Add
      </Button>
    </div>
  );
}
