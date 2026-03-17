import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { ChooseCourse } from '@/app/ui/ChooseCourse';
import { fetchCourses } from '@/app/lib/data';

export default async function Page() {
  const courses = await fetchCourses();

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>
        Choose course to strengthen memory in
      </h1>
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
