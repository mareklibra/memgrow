'use client';

import { useState } from 'react';
import { s } from '@/app/ui/styles';
import { Button, Input } from '@/app/lib/material-tailwind-compat';
import { Course } from '../lib/definitions';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

export function EditCourse({
  course,
  priority: initialPriority,
  onSave,
}: {
  course: Course;
  priority: number;
  onSave: (data: {
    courseCode: string;
    priority: number;
  }) => Promise<{ message?: string } | undefined>;
}) {
  const [courseCode, setCourseCode] = useState(course.courseCode);
  const [priority, setPriority] = useState(initialPriority);
  const [error, setError] = useState<string | undefined>();
  const { t } = useTranslation();

  const handleSave = async () => {
    const result = await onSave({ courseCode, priority });
    if (result?.message) {
      setError(result.message);
    }
  };

  return (
    <div className={s.narrowForm}>
      <Input
        label={t('course.courseCode')}
        value={courseCode}
        size="lg"
        onChange={(e) => setCourseCode(e.target.value)}
        minLength={2}
      />
      <Input
        label={t('course.priorityHidden')}
        type="number"
        value={String(priority)}
        size="lg"
        onChange={(e) => setPriority(Number(e.target.value))}
      />
      <Button className="h-fit" onClick={handleSave}>
        {t('common.update')}
      </Button>
      {error && <p className={s.errorText}>{error}</p>}
    </div>
  );
}
