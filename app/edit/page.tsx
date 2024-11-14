import { fetchAllWords } from "@/app/lib/data";
import { lusitana } from "@/app/ui/fonts";
import { EditWords } from "@/app/ui/EditWords";

export default async function Page() {
  const words = await fetchAllWords();

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        All words ({words.length})
      </h1>
      <EditWords words={words} />
    </main>
  );
}
