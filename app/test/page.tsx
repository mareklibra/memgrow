import { lusitana } from '@/app/ui/fonts';
import { ChooseCourse } from '@/app/ui/ChooseCourse';
import { fetchCourses } from '@/app/lib/data';

export default async function Page() {
  const courses = await fetchCourses();

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Choose course to strengthen memory in
      </h1>
      <ChooseCourse courses={courses} pathPrefix="/test" />
    </main>
  );
}
