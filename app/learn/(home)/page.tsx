import { fetchCourses } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { ChooseCourse } from '@/app/ui/ChooseCourse';

export default async function Page() {
  const courses = await fetchCourses();

  return (
    <>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Choose course to learn new words from
      </h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/learn"
        showPriority={false}
        showFastEntry={false}
      />
    </>
  );
}
