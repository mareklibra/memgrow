import { Course as CourseType } from '@/app/lib/definitions';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const Course = ({ course, pathPrefix }: { course: CourseType; pathPrefix: string }) => (
  <li className="pb-3 sm:pb-4">
    <div className="flex items-center space-x-4 rtl:space-x-reverse">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          <span className="inline-flex items-center text-base font-semibold text-gray-900">
            <ChevronDoubleRightIcon className="h-5 w-5 text-gray-900" />
            <Link href={`${pathPrefix}/${course.id}`}>{course.name}</Link>
          </span>
        </p>

        <p className="text-sm text-gray-600 truncate">
          Learning {course.learningLang} from {course.knownLang}
        </p>
      </div>
      <div className="inline-flex items-center text-base font-semibold text-gray-900">
        {/* TODO: statistics */}
      </div>
    </div>
  </li>
);

export const ChooseCourse = ({
  courses,
  pathPrefix,
}: {
  courses: CourseType[];
  pathPrefix: string;
}) => {
  return (
    <ul className="max-w-md divide-y divide-gray-200 dark:divide-gray-700">
      {courses.map((course) => (
        <Course course={course} key={course.id} pathPrefix={pathPrefix} />
      ))}
    </ul>
  );
};
