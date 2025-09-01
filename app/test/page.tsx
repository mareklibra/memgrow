import { lusitana } from '@/app/ui/fonts';
import { ChooseCourse } from '@/app/ui/ChooseCourse';
import { fetchCourses } from '@/app/lib/data';

export default async function Page() {
  const courses = await fetchCourses();

  return (
    <div className="pt-4 pr-4">
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Choose course to strengthen memory in
      </h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/test"
        showPriority={true}
        showFastEntry={false}
        showForOffline={true}
      />
    </div>
  );
}
