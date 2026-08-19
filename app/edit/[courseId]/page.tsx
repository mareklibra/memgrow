import { fetchAllWords, fetchCourse, fetchCoursePriority } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { EditWords } from '@/app/ui/EditWords';
import Link from 'next/link';
import { EditCourse } from '@/app/ui/EditCourse';
import { AutoLearnButton } from '@/app/ui/AutoLearnButton';
import { updateCourse, upsertCoursePriority } from '@/app/lib/actions';
import { revalidatePath } from 'next/cache';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { t } = await getI18n();
  if (!courseId) {
    return (
      <>
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>
          {t('edit.missingCourse')}
        </h1>
        <p>
          {t('edit.goToEditBefore')}
          <Link href="/edit">{t('edit.editLink')}</Link>
          {t('edit.goToEditAfter')}
        </p>
      </>
    );
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return (
      <>
        <h1 className={`${lusitana.className} ${s.pageTitle}`}>
          {t('edit.missingCourse')}
        </h1>
        <p>
          {t('edit.goToEditBefore')}
          <Link href="/edit">{t('edit.editLink')}</Link>
          {t('edit.goToEditAfterA')}
        </p>
      </>
    );
  }

  const priority = (await fetchCoursePriority(courseId)) ?? 0;

  const handleSave = async (data: {
    courseCode: string;
    priority: number;
  }): Promise<{ message?: string } | undefined> => {
    'use server';
    const courseResult = await updateCourse(courseId, { courseCode: data.courseCode });
    if (courseResult?.message) return courseResult;
    const priorityResult = await upsertCoursePriority(courseId, data.priority);
    if (priorityResult?.message) return priorityResult;
    revalidatePath(`/edit/${courseId}`);
  };

  const forceDbReload = async () => {
    'use server';
    revalidatePath('/edit');
  };

  const words = await fetchAllWords(courseId);
  const toLearnCount = words.filter((w) => w.memLevel === 0).length;
  return (
    <>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>
        {t('edit.allWords', {
          count: words.length,
          name: course.name,
          code: course.courseCode,
        })}
      </h1>
      <AutoLearnButton courseId={courseId} toLearnCount={toLearnCount} className="mr-4" />
      <EditWords words={words} courseId={courseId} forceDbReload={forceDbReload} />
      <hr className={s.sectionSeparator} />
      <h2 className={`${lusitana.className} text-xl font-semibold mb-4`}>
        {t('edit.configuration')}
      </h2>
      <EditCourse course={course} priority={priority} onSave={handleSave} />
    </>
  );
}
