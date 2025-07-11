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
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ priorityFirst: string }>;
}) {
  const { courseId } = await params;
  const { priorityFirst } = await searchParams;
  const wordsToTest = await fetchWordsToTest(
    courseId,
    testWordsCountLimit,
    priorityFirst === 'true',
  );
  const words = await fetchSimilarWords(courseId, wordsToTest, maxSimilarWords);

  return (
    <IterateWords
      words={words}
      repetitionLimit={testRepetitionLimit}
      title="Strengthen memory with "
      specialKeys={getSpecialKeys([...words, ...wordsToTest])}
    />
  );
}
