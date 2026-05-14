import { fetchCourses, fetchWordImageSummaries } from '@/app/lib/data';
import { requestImageGeneration } from '@/app/lib/actions';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { ImagesManager } from '@/app/ui/ImagesManager';
import { WordImageSummary } from '@/app/lib/types';

export default async function Page() {
  const courses = await fetchCourses();

  const fetchSummaries = async (courseId: string): Promise<WordImageSummary[]> => {
    'use server';
    return await fetchWordImageSummaries(courseId);
  };

  const handleRequestGeneration = async (wordId: string) => {
    'use server';
    return await requestImageGeneration(wordId);
  };

  return (
    <div className={s.pageContainer}>
      <h1 className={`${lusitana.className} ${s.pageTitle}`}>Image Generation</h1>
      <ImagesManager
        courses={courses}
        fetchSummaries={fetchSummaries}
        requestGeneration={handleRequestGeneration}
      />
    </div>
  );
}
