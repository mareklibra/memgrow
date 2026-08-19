import { fetchAllWords, fetchCourse } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { s } from '@/app/ui/styles';
import { SimulateProgress } from '@/app/ui/SimulateProgress';
import type { SimulationWord } from '@/app/lib/simulate';
import Link from 'next/link';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { t } = await getI18n();
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
    <div className={s.pageContainer}>
      <Link href="/test" className="text-sm text-blue-600 hover:underline">
        {t('test.backToCourses')}
      </Link>
      <h1 className={`${lusitana.className} mt-2 ${s.pageTitle}`}>
        {t('test.simulateTitle', { name: course?.name ?? '' })}
      </h1>
      <SimulateProgress words={wordsForSimulation} />
    </div>
  );
}
