import {
  learnRepetitionLimit,
  learnWordsCountLimit,
  learnWordsCountLimitOffline,
  maxSimilarWords,
} from '@/app/constants';
import { fetchSimilarWords, fetchWordsToLearn } from '@/app/lib/data';
import { queryExamples, deleteExample } from '@/app/lib/actions';
import { getSpecialKeys } from '@/app/lib/utils';
import { IterateWords } from '@/app/ui/IterateWords';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ offline?: string }>;
}) {
  const { courseId } = await params;
  const { offline } = await searchParams;
  const isOffline = offline === 'true';
  const wordsToLearn = await fetchWordsToLearn(
    courseId,
    isOffline ? learnWordsCountLimitOffline : learnWordsCountLimit,
  );
  const words = await fetchSimilarWords(courseId, wordsToLearn, maxSimilarWords);

  return (
    <IterateWords
      words={words}
      repetitionLimit={learnRepetitionLimit}
      isLearning
      title="Learn "
      specialKeys={getSpecialKeys(words)}
      isOffline={isOffline}
      queryExamples={queryExamples}
      deleteExample={deleteExample}
    />
  );
}
