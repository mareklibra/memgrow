import { Word } from "@/app/lib/definitions";

interface ShowWordProps {
  word: Word;
}

export function ShowWord({ word }: ShowWordProps) {
  return (
    <>
      <div className="w-full rounded-md border border-blue-200 py-[20px] pl-10 text-lg outline-2 mb-8">
        {word.word}
      </div>
      <div className="w-full rounded-md border border-gray-200 py-[20px] pl-10 text-lg outline-2 mb-8">
        {word.definition}
      </div>
    </>
  );
}
