import { fetchAllWords, fetchCourse } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { EditWords } from '@/app/ui/EditWords';
import Link from 'next/link';
import { EditCourse } from '@/app/ui/EditCourse';
import { updateCourse } from '@/app/lib/actions';
import { revalidatePath } from 'next/cache';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!courseId) {
    return (
      <>
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>Missing course</h1>
        <p>
          Go to <Link href="/edit">edit</Link> to choose course.
        </p>
      </>
    );
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return (
      <>
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>Missing course</h1>
        <p>
          Go to <Link href="/edit">edit</Link> to choose a course.
        </p>
      </>
    );
  }

  const handleSave = async (course: {
    courseCode: string;
  }): Promise<{ message?: string } | undefined> => {
    'use server';
    return await updateCourse(courseId, course);
  };

  const forceDbReload = async () => {
    'use server';
    revalidatePath('/edit');
  };

  const words = await fetchAllWords(courseId);
  return (
    <>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>
        All words ({words.length}) of course {course.name} ({course.courseCode})
      </h1>
      <EditWords words={words} courseId={courseId} forceDbReload={forceDbReload} />
      <hr className={s.sectionSeparator} />
      <EditCourse course={course} onSave={handleSave} />
    </>
  );
}
