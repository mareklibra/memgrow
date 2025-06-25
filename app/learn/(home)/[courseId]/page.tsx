import {
  learnRepetitionLimit,
  learnWordsCountLimit,
  maxSimilarWords,
} from '@/app/constants';
import { fetchSimilarWords, fetchWordsToLearn } from '@/app/lib/data';
import { getSpecialKeys } from '@/app/lib/utils';
import { IterateWords } from '@/app/ui/IterateWords';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const wordsToLearn = await fetchWordsToLearn(courseId, learnWordsCountLimit);
  const words = await fetchSimilarWords(courseId, wordsToLearn, maxSimilarWords);

  return (
    <main>
      <IterateWords
        words={words}
        repetitionLimit={learnRepetitionLimit}
        isLearning
        title="Learn "
        specialKeys={getSpecialKeys([...words, ...wordsToLearn])}
      />
    </main>
  );
}
