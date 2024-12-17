import { lusitana } from "@/app/ui/fonts";
import { IterateWords } from "@/app/ui/IterateWords";
import { fetchSimilarWords, fetchWordsToTest } from "@/app/lib/data";
import { maxSimilarWords, testRepetitionLimit, testWordsCountLimit } from "../constants";

export default async function Page() {
  const courseId = '3958dc9e-712f-4377-85e9-fec4b6a6442a'; // TODO

  const words = await fetchSimilarWords(
    courseId,
    await fetchWordsToTest(courseId, testWordsCountLimit),
    maxSimilarWords
  );

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Strengthen memory ({words.length})
      </h1>
      <IterateWords words={words} repetitionLimit={testRepetitionLimit} />
    </main>
  );
}
