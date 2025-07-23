import { fetchCourse } from '@/app/lib/data';
import { NewWordRow, thClass } from '@/app/ui/EditWords';
import { lusitana } from '@/app/ui/fonts';
import clsx from 'clsx';
import Link from 'next/link';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!courseId) {
    return (
      <>
        <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
          Missing course
        </h1>
        <p>
          Go to <Link href="/edit">edit</Link> to choose and edit a course.
        </p>
      </>
    );
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return (
      <>
        <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
          Missing course
        </h1>
        <p>
          Go to <Link href="/edit">edit</Link> to choose and edit a course.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Fast entry for course {course.name}
      </h1>
      <table className="divide-y divide-gray-200 dark:divide-neutral-700">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col" className={thClass}>
              Word
            </th>
            <th scope="col" className={thClass}>
              Definition
            </th>
            <th scope="col" className={clsx(thClass, 'w-50')}>
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          <NewWordRow courseId={courseId} fastEntry />
        </tbody>
      </table>
      <p>
        For full features, go to the{' '}
        <Link color="" href={`/edit/${courseId}`}>
          Edit
        </Link>
        page.
      </p>
    </>
  );
}
