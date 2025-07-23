'use client';
import { useState } from 'react';
import { Course as CourseType } from '@/app/lib/definitions';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { Switch } from '@material-tailwind/react';
import Link from 'next/link';

const Course = ({
  course,
  pathPrefix,
  showPriority,
  showFastEntry,
}: {
  course: CourseType;
  pathPrefix: string;
  showPriority: boolean;
  showFastEntry: boolean;
}) => {
  const [isPriorityFirst, setIsPriorityFirst] = useState(false);

  let link = `${pathPrefix}/${course.id}`;
  if (showPriority) {
    link += `?priorityFirst=${isPriorityFirst}`;
  }

  return (
    <div
      id={`course-${course.id}`}
      className="my-6 bg-white shadow-sm border border-slate-200 rounded-lg m-2 w-96 min-w-64"
    >
      {/* <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1">
      <span className="text-sm text-slate-600 font-medium">
        TODO: add course statistics
      </span>
    </div> */}

      <div className="p-4">
        <Link href={link}>
          <h5 className="mb-2 text-slate-800 text-xl font-semibold">
            <span className="inline-flex items-center text-base font-semibold text-gray-900">
              <ChevronDoubleRightIcon className="h-5 w-5 text-gray-900" />
              {course.name}
            </span>
          </h5>
          <p className="text-slate-600 leading-normal font-light">
            Learning {course.learningLang} from {course.knownLang}
          </p>
        </Link>

        {showPriority && (
          <div className="flex justify-end mt-2">
            <Switch
              crossOrigin={undefined}
              label="Priority first"
              checked={isPriorityFirst}
              onChange={() => setIsPriorityFirst(!isPriorityFirst)}
            />
          </div>
        )}

        {showFastEntry && (
          <div className="flex justify-end mt-2">
            <Link href={`/edit/fastentry/${course.id}`}>&gt;&gt; Fast entry</Link>
          </div>
        )}
      </div>
    </div>
  );
};
export const ChooseCourse = ({
  courses,
  pathPrefix,
  showPriority,
  showFastEntry,
}: {
  courses: CourseType[];
  pathPrefix: string;
  showPriority: boolean;
  showFastEntry: boolean;
}) => {
  return (
    <div className="flex w-10/12 flex-wrap" id="choose-course">
      {courses.map((course) => (
        <Course
          course={course}
          key={course.id}
          pathPrefix={pathPrefix}
          showPriority={showPriority}
          showFastEntry={showFastEntry}
        />
      ))}
    </div>
  );
};
