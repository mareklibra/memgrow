import {
  learnRepetitionLimit,
  learnWordsCountLimit,
  maxSimilarWords,
} from '@/app/constants';
import { fetchSimilarWords, fetchWordsToLearn } from '@/app/lib/data';
import { IterateWords } from '@/app/ui/IterateWords';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const words = await fetchSimilarWords(
    courseId,
    await fetchWordsToLearn(courseId, learnWordsCountLimit),
    maxSimilarWords,
  );

  return (
    <main>
      <IterateWords
        words={words}
        repetitionLimit={learnRepetitionLimit}
        isLearning
        title="Learn "
      />
    </main>
  );
}
