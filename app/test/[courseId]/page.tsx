import { IterateWords } from '@/app/ui/IterateWords';
import { fetchSimilarWords, fetchWordsToTest } from '@/app/lib/data';
import {
  maxSimilarWords,
  testRepetitionLimit,
  testWordsCountLimit,
  testWordsCountLimitOffline,
  testWordsDeepMemoryCountLimit,
} from '@/app/constants';
import { getSpecialKeys } from '@/app/lib/utils';
import {
  queryExamples,
  deleteExample,
  queryWordImages,
  deleteWordImage,
  requestImageGeneration,
} from '@/app/lib/actions';
import { getI18n } from '@/app/lib/i18n/get-i18n';

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
    isOffline ? 0 : testWordsDeepMemoryCountLimit,
  );

  const words = await fetchSimilarWords(courseId, wordsToTest, maxSimilarWords);
  const randomlyShuffledWords = [...words].sort(
    () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32 - 0.5,
  );
  const { t } = await getI18n();

  return (
    <IterateWords
      words={randomlyShuffledWords}
      repetitionLimit={testRepetitionLimit}
      title={t('test.title')}
      specialKeys={getSpecialKeys(words)}
      isOffline={isOffline}
      queryExamples={queryExamples}
      deleteExample={deleteExample}
      queryImages={queryWordImages}
      deleteImage={deleteWordImage}
      requestImageGeneration={requestImageGeneration}
    />
  );
}
