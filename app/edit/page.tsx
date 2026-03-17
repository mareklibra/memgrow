import { fetchCourses } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { ChooseCourse } from '@/app/ui/ChooseCourse';
import { CreateCourse } from '../ui/CreateCourse';
import { createCourse } from '../lib/actions';

export default async function Page() {
  const courses = await fetchCourses();

  const handleSave = async (course: {
    name: string;
    knownLang: string;
    learningLang: string;
    courseCode: string;
  }): Promise<{ message?: string } | undefined> => {
    'use server';
    return await createCourse(course);
  };

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>Choose course to edit</h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/edit"
        showPriority={false}
        showFastEntry={true}
        showForOffline={false}
      />
      <hr className={s.sectionSeparator} />
      <CreateCourse onSave={handleSave} />
    </div>
  );
}
