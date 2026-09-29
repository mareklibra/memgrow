import { canChangeSharedDicts, fetchEditableCourses } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { ChooseCourse } from '@/app/ui/ChooseCourse';
import { CreateCourse } from '../ui/CreateCourse';
import { createCourse, createPrivateCourse } from '../lib/actions';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import { auth } from '@/auth';

export default async function Page() {
  const courses = await fetchEditableCourses();
  const { t } = await getI18n();
  const session = await auth();
  const canEditShared = session?.user?.id
    ? await canChangeSharedDicts(session.user.id)
    : false;

  const handleSavePublic = async (course: {
    name: string;
    knownLang: string;
    learningLang: string;
    courseCode: string;
  }): Promise<{ message?: string } | undefined> => {
    'use server';
    return await createCourse(course);
  };

  const handleSavePrivate = async (course: {
    name: string;
    knownLang: string;
    learningLang: string;
    courseCode: string;
  }): Promise<{ message?: string } | undefined> => {
    'use server';
    return await createPrivateCourse(course);
  };

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>{t('edit.chooseCourse')}</h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/edit"
        showPriority={false}
        showFastEntry={true}
        showForOffline={false}
        showAllSwitch={false}
      />
      <hr className={s.sectionSeparator} />
      <CreateCourse
        onSavePrivate={handleSavePrivate}
        onSavePublic={canEditShared ? handleSavePublic : undefined}
      />
    </div>
  );
}
