import { fetchWordsToLearn } from "@/app/lib/data";
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
  // TODO: let the user configure that
  const learnLimit = 5;
  const words = await fetchWordsToLearn(learnLimit);

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Learn new words ({words.length})
      </h1>
      <IterateWords words={words} repetitionLimit={2} isLearning />
    </main>
  );
}
