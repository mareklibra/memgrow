import { fetchCourses } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
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
    <>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Choose course to edit
      </h1>
      <ChooseCourse
        courses={courses}
        pathPrefix="/edit"
        showPriority={false}
        showFastEntry={true}
        showForOffline={false}
      />
      <hr className="w-full m-4 border-t-2 border-gray-400" />
      <CreateCourse onSave={handleSave} />
    </>
  );
}
