import { IterateWords } from '@/app/ui/IterateWords';
import { fetchSimilarWords, fetchWordsToTest } from '@/app/lib/data';
import {
  maxSimilarWords,
  testRepetitionLimit,
  testWordsCountLimit,
  testWordsCountLimitOffline,
} from '@/app/constants';
import { getSpecialKeys } from '@/app/lib/utils';
import { queryExamples, deleteExample } from '@/app/lib/examples';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ priorityFirst?: string; offline?: string }>;
}) {
  const { courseId } = await params;
  const { priorityFirst, offline } = await searchParams;
  const isOffline = offline === 'true';
  const wordsToTest = await fetchWordsToTest(
    courseId,
    isOffline ? testWordsCountLimitOffline : testWordsCountLimit,
    priorityFirst === 'true',
  );

  const words = await fetchSimilarWords(courseId, wordsToTest, maxSimilarWords);
  const randomlyShuffledWords = words.sort(() => Math.random() - 0.5);

  return (
    <IterateWords
      words={randomlyShuffledWords}
      repetitionLimit={testRepetitionLimit}
      title="Strengthen memory with "
      specialKeys={getSpecialKeys([...words, ...wordsToTest])}
      isOffline={isOffline}
      queryExamples={queryExamples}
      deleteExample={deleteExample}
    />
  );
}
