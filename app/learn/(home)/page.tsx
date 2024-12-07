import { learnWordsCountLimit, maxSimilarWords } from "@/app/constants";
import { fetchSimilarWords, fetchWordsToLearn } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";
import { IterateWords } from "@/app/ui/IterateWords";

// const mockWords: Word[] = [
//   {
//     id: "0",
//     word: "el sol",
//     definition: "slunce",
//     form: "show",
//     memLevel: 0,
//   },
//   {
//     id: "1",
//     word: "el perro",
//     definition: "pes",
//     form: "show",
//     memLevel: 0,
//   },
// ];

export default async function Page() {
  const words = await fetchSimilarWords(
    await fetchWordsToLearn(learnWordsCountLimit),
    maxSimilarWords
  );

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Learn new words ({words.length})
      </h1>
      <IterateWords words={words} repetitionLimit={2} isLearning />
    </main>
  );
}
