'use client';

import { useState } from 'react';
import { Button, Input } from '@material-tailwind/react';
import { Course } from '../lib/definitions';

export function EditCourse({
  course,
  onSave,
}: {
  course: Course;
  onSave: (course: { courseCode: string }) => Promise<{ message?: string } | undefined>;
}) {
  const [courseCode, setCourseCode] = useState(course.courseCode);
  const [error, setError] = useState<string | undefined>();

  const handleSave = async () => {
    const result = await onSave({ courseCode });
    if (result?.message) {
      setError(result.message);
    }
  };

  return (
    <div className="flex flex-row-reverse space-x-4">
      <Button className="h-fit" onClick={handleSave}>
        Update
      </Button>
      <div className="flex flex-col">
        <Input
          className="w-24"
          label="ISO-631 course code"
          value={courseCode}
          size="lg"
          crossOrigin={undefined}
          onChange={(e) => setCourseCode(e.target.value)}
          minLength={2}
        />
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
