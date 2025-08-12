import Link from 'next/link';

import { fetchCourse } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { FastEntryForm } from '@/app/ui/FastEntryForm';
import { WordToAdd } from '@/app/lib/definitions';
import { addWord, queryTranslations } from '@/app/lib/actions';
import { UpdateWordResult } from '@/app/lib/types';

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

  const handleAdd = async (word: WordToAdd): Promise<UpdateWordResult | undefined> => {
    'use server';
    return await addWord(word);
  };

  return (
    <>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Fast entry for course {course.name}
      </h1>
      <div className="flex flex-col gap-2">
        <FastEntryForm
          course={course}
          addWord={handleAdd}
          queryTranslations={queryTranslations}
        />
      </div>
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
