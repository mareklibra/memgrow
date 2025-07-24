'use client';

import { useState } from 'react';
import { Button, Input } from '@material-tailwind/react';

export function CreateCourse({
  onSave,
}: {
  onSave: (course: {
    name: string;
    knownLang: string;
    learningLang: string;
    courseCode: string;
  }) => Promise<{ message?: string } | undefined>;
}) {
  const [name, setName] = useState('');
  const [learningLang, setLearningLang] = useState('');
  const [knownLang, setKnownLang] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleSave = async () => {
    setError(undefined);
    const result = await onSave({ name, learningLang, knownLang, courseCode });
    if (result?.message) {
      setError(result.message);
    } else {
      setName('');
      setLearningLang('');
      setKnownLang('');
      setCourseCode('');
    }
  };

  return (
    <div className="flex flex-row space-x-4">
      <Input
        className="w-24"
        label="Name"
        value={name}
        size="lg"
        crossOrigin={undefined}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
      />

      <Input
        className="w-24"
        label="Learning language"
        value={learningLang}
        size="lg"
        crossOrigin={undefined}
        onChange={(e) => setLearningLang(e.target.value)}
        minLength={2}
      />

      <Input
        className="w-24"
        label="From language"
        value={knownLang}
        size="lg"
        crossOrigin={undefined}
        onChange={(e) => setKnownLang(e.target.value)}
        minLength={2}
      />

      <Input
        className="w-24"
        label="ISO-631 course code"
        value={courseCode}
        size="lg"
        crossOrigin={undefined}
        onChange={(e) => setCourseCode(e.target.value)}
        minLength={2}
      />

      <div className="flex flex-col">
        <Button className="h-fit" onClick={handleSave}>
          Create
        </Button>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
