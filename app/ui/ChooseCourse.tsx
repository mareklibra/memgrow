import { Course as CourseType } from '@/app/lib/definitions';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const Course = ({ course, pathPrefix }: { course: CourseType; pathPrefix: string }) => (
  <div className="relative flex flex-col my-6 bg-white shadow-sm border border-slate-200 rounded-lg w-96 m-2">
    {/* <div className="mx-3 mb-0 border-b border-slate-200 pt-3 pb-2 px-1">
      <span className="text-sm text-slate-600 font-medium">
        TODO: add course statistics
      </span>
    </div> */}

    <div className="p-4">
      <h5 className="mb-2 text-slate-800 text-xl font-semibold">
        <span className="inline-flex items-center text-base font-semibold text-gray-900">
          <ChevronDoubleRightIcon className="h-5 w-5 text-gray-900" />
          <Link href={`${pathPrefix}/${course.id}`}>{course.name}</Link>
        </span>
      </h5>
      <p className="text-slate-600 leading-normal font-light">
        Learning {course.learningLang} from {course.knownLang}
      </p>
    </div>
  </div>
);

export const ChooseCourse = ({
  courses,
  pathPrefix,
}: {
  courses: CourseType[];
  pathPrefix: string;
}) => {
  return (
    <div className="flex">
      {courses.map((course) => (
        <Course course={course} key={course.id} pathPrefix={pathPrefix} />
      ))}
    </div>
  );
};
