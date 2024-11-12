import { Word } from "@/app/lib/definitions";

interface TypeTranslationProps {
  word: Word;
  onValue: (value: string, oneChanceOnly: boolean) => void;
}

export function TypeTranslation({ word, onValue }: TypeTranslationProps) {
  const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    onValue(value, false);
  };

  return (
    <>
      <div className="w-full rounded-md border border-blue-200 py-[20px] pl-10 text-lg outline-2 mb-8">
        {word.word}
      </div>
      <div>
        <input
          className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
          id="word-input"
          type="text"
          placeholder="Enter your translation"
          onChange={handleChange}
          autoFocus
          required
        />
      </div>
    </>
  );
}
