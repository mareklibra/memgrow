import { fetchCourses } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { ChooseCourse } from '@/app/ui/ChooseCourse';

export default async function Page() {
  const courses = await fetchCourses();

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>
        Choose course to learn new words from
      </h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/learn"
        showPriority={false}
        showFastEntry={false}
        showForOffline={true}
      />
    </div>
  );
}
