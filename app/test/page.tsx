import { lusitana } from "@/app/ui/fonts";
import { IterateWords } from "@/app/ui/IterateWords";
import { fetchSimilarWords, fetchWordsToTest } from "@/app/lib/data";
import { maxSimilarWords, testWordsCountLimit } from "../constants";

export default async function Page() {
  const words = await fetchSimilarWords(
    await fetchWordsToTest(testWordsCountLimit),
    maxSimilarWords
  );

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Strengthen memory ({words.length})
      </h1>
      <IterateWords words={words} repetitionLimit={1} />
    </main>
  );
}
