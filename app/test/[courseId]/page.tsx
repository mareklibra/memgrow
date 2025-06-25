import { IterateWords } from '@/app/ui/IterateWords';
import { fetchSimilarWords, fetchWordsToTest } from '@/app/lib/data';
import {
  maxSimilarWords,
  testRepetitionLimit,
  testWordsCountLimit,
} from '@/app/constants';
import { getSpecialKeys } from '@/app/lib/utils';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const wordsToTest = await fetchWordsToTest(courseId, testWordsCountLimit);
  const words = await fetchSimilarWords(courseId, wordsToTest, maxSimilarWords);

  return (
    <main>
      <IterateWords
        words={words}
        repetitionLimit={testRepetitionLimit}
        title="Strengthen memory with "
        specialKeys={getSpecialKeys([...words, ...wordsToTest])}
      />
    </main>
  );
}
