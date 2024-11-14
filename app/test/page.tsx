import { lusitana } from "@/app/ui/fonts";
import { IterateWords } from "@/app/ui/IterateWords";
import { fetchWordsToTest } from "@/app/lib/data";

export default async function Page() {
  // TODO: let the user configure that
  const testWordsCountLimit = 3;
  const words = await fetchWordsToTest(testWordsCountLimit);

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Strengthen memory ({words.length})
      </h1>
      <IterateWords words={words} repetitionLimit={1} />
    </main>
  );
}
