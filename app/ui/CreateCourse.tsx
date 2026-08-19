'use client';

import { useState } from 'react';
import { s } from '@/app/ui/styles';
import { Button, Input } from '@/app/lib/material-tailwind-compat';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

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
  const { t } = useTranslation();

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
        label={t('course.name')}
        value={name}
        size="lg"
        onChange={(e) => setName(e.target.value)}
        minLength={2}
      />

      <Input
        className="w-24"
        label={t('course.learningLanguage')}
        value={learningLang}
        size="lg"
        onChange={(e) => setLearningLang(e.target.value)}
        minLength={2}
      />

      <Input
        className="w-24"
        label={t('course.fromLanguage')}
        value={knownLang}
        size="lg"
        onChange={(e) => setKnownLang(e.target.value)}
        minLength={2}
      />

      <Input
        className="w-24"
        label={t('course.courseCode')}
        value={courseCode}
        size="lg"
        onChange={(e) => setCourseCode(e.target.value)}
        minLength={2}
      />

      <div className="flex flex-col">
        <Button className="h-fit" onClick={handleSave}>
          {t('common.create')}
        </Button>
        {error && <p className={s.errorText}>{error}</p>}
      </div>
    </div>
  );
}
