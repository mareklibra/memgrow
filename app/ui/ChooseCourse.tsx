'use client';
import { useState } from 'react';
import { Course as CourseType } from '@/app/lib/definitions';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { Switch } from '@material-tailwind/react';
import Link from 'next/link';
import Image from 'next/image';

const Course = ({
  course,
  pathPrefix,
  showPriority,
  showFastEntry,
  showForOffline,
}: {
  course: CourseType;
  pathPrefix: string;
  showPriority: boolean;
  showFastEntry: boolean;
  showForOffline: boolean;
}) => {
  const [isPriorityFirst, setIsPriorityFirst] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  let link = `${pathPrefix}/${course.id}`;
  if (showPriority) {
    link += `?priorityFirst=${isPriorityFirst}`;
  }
  if (showForOffline) {
    if (link.includes('?')) {
      link += `&offline=${isOffline}`;
    } else {
      link += `?offline=${isOffline}`;
    }
  }

  return (
    <div
      id={`course-${course.id}`}
      className="my-6 bg-white shadow-sm border border-slate-200 rounded-lg m-2 w-96 min-w-64"
    >
      <div className="p-4">
        <Link href={link}>
          <h5 className="flex flex-row items-center mb-2 text-slate-800 text-xl font-semibold">
            <ChevronDoubleRightIcon className="h-5 w-5 text-gray-900" />
            <div className="text-base font-semibold text-gray-900">{course.name}</div>

            <Image
              className="ml-2"
              src={`/${course.courseCode}_flag.svg`}
              width={20}
              height={20}
              alt={`${course.learningLang} (${course.courseCode}) flag`}
            />
          </h5>
          <p className="text-slate-600 leading-normal font-light">
            Learning {course.learningLang} from {course.knownLang}
          </p>
        </Link>

        <p className="text-slate-600 leading-normal font-light text-xs">
          {course.toTest} to refresh, {course.toLearn} new to learn, {course.total} total
        </p>

        {showForOffline && (
          <div className="flex justify-end mt-2">
            <Switch
              crossOrigin={undefined}
              label="For offline"
              checked={isOffline}
              onChange={() => setIsOffline(!isOffline)}
            />
          </div>
        )}

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
  showForOffline,
}: {
  courses: CourseType[];
  pathPrefix: string;
  showPriority: boolean;
  showFastEntry: boolean;
  showForOffline: boolean;
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
          showForOffline={showForOffline}
        />
      ))}
    </div>
  );
};
