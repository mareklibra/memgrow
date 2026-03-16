import { fetchAllWords, fetchCourse } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { SimulateProgress } from '@/app/ui/SimulateProgress';
import Link from 'next/link';

export type SimulationWord = {
  memLevel: number;
  repeatAgain: string;
};

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [course, allWords] = await Promise.all([
    fetchCourse(courseId),
    fetchAllWords(courseId),
  ]);

  const wordsForSimulation: SimulationWord[] = allWords
    .filter((w) => w.memLevel > 0)
    .map((w) => ({
      memLevel: w.memLevel,
      repeatAgain: w.repeatAgain.toISOString(),
    }));

  return (
    <div className="pt-4 pr-4">
      <Link href="/test" className="text-sm text-blue-600 hover:underline">
        &laquo; Back to courses
      </Link>
      <h1 className={`${lusitana.className} mt-2 mb-4 text-xl md:text-2xl`}>
        Simulate progress: {course?.name}
      </h1>
      <SimulateProgress words={wordsForSimulation} />
    </div>
  );
}
