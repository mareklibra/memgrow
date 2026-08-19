import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { ChooseCourse } from '@/app/ui/ChooseCourse';
import { fetchCourses } from '@/app/lib/data';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export default async function Page() {
  const courses = await fetchCourses();
  const { t } = await getI18n();

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>{t('test.chooseCourse')}</h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/test"
        showPriority={true}
        showFastEntry={false}
        showForOffline={true}
        showSimulate={true}
      />
    </div>
  );
}
