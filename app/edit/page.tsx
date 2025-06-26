import { fetchAllWords } from '@/app/lib/data';
import { lusitana } from '@/app/ui/fonts';
import { EditWords } from '@/app/ui/EditWords';

export default async function Page() {
  const courseId = '3958dc9e-712f-4377-85e9-fec4b6a6442a'; // TODO

  const words = await fetchAllWords(courseId);

  return (
    <>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        All words ({words.length})
      </h1>
      <EditWords words={words} courseId={courseId} />
    </>
  );
}
