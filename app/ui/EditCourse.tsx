'use client';

import { useState } from 'react';
import { s } from '@/app/ui/styles';
import { Button, Input } from '@/app/lib/material-tailwind-compat';
import { Course } from '../lib/definitions';

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

  const handleSave = async () => {
    const result = await onSave({ courseCode, priority });
    if (result?.message) {
      setError(result.message);
    }
  };

  return (
    <div className={s.narrowForm}>
      <Input
        label="ISO-631 course code"
        value={courseCode}
        size="lg"
        onChange={(e) => setCourseCode(e.target.value)}
        minLength={2}
      />
      <Input
        label="Priority (0 = hidden)"
        type="number"
        value={String(priority)}
        size="lg"
        onChange={(e) => setPriority(Number(e.target.value))}
      />
      <Button className="h-fit" onClick={handleSave}>
        Update
      </Button>
      {error && <p className={s.errorText}>{error}</p>}
    </div>
  );
}
