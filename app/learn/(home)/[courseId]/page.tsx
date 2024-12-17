import {
  learnRepetitionLimit,
  learnWordsCountLimit,
  maxSimilarWords,
} from '@/app/constants';
import { fetchSimilarWords, fetchWordsToLearn } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
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
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Learn new words ({words.length})
      </h1>
      <IterateWords words={words} repetitionLimit={learnRepetitionLimit} isLearning />
    </main>
  );
}
