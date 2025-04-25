import { IterateWords } from '@/app/ui/IterateWords';
import { fetchSimilarWords, fetchWordsToTest } from '@/app/lib/data';
import {
  maxSimilarWords,
  testRepetitionLimit,
  testWordsCountLimit,
} from '@/app/constants';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const words = await fetchSimilarWords(
    courseId,
    await fetchWordsToTest(courseId, testWordsCountLimit),
    maxSimilarWords,
  );

  return (
    <main>
      <IterateWords
        words={words}
        repetitionLimit={testRepetitionLimit}
        title="Strengthen memory with "
      />
    </main>
  );
}
