import Link from 'next/link';

import { fetchCourse } from '@/app/lib/data';
import { EditWordHeader } from '@/app/ui/EditWordHeader';
import { lusitana } from '@/app/ui/fonts';
import { NewWordRow } from '@/app/ui/EditWordRow';

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
        <EditWordHeader fastEntry />
        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
          <NewWordRow courseId={courseId} fastEntry />
        </tbody>
      </table>
      <p>
        For full features, go to the{' '}
        <Link color="" href={`/edit/${courseId}`}>
          Edit
        </Link>
        &nbsp; page.
      </p>
    </>
  );
}
