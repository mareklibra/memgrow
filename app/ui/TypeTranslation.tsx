import { Word } from "@/app/lib/definitions";
import { FieldStatus } from "./types";
import clsx from "clsx";
import { WordDefinition, WordStatic } from "./ShowWord";

interface TypeTranslationProps {
  word: Word;
  status: FieldStatus;
  onValue: (value: string, oneChanceOnly: boolean) => void;
}

export function TypeTranslation({
  word,
  onValue,
  status,
}: TypeTranslationProps) {
  const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    onValue(value, false);
  };

  return (
    <>
      <WordStatic word={word.word} />
      <div>
        <input
          className={clsx(
            "peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500",
            {
              "bg-green-600": status === "correct",
              "bg-red-500": status === "mistake",
            }
          )}
          id="word-input"
          type="text"
          placeholder="Enter your translation"
          onChange={handleChange}
          autoFocus
          disabled={status !== "normal"}
          required
        />
        {status === "mistake" && (
          <WordDefinition
            definition={word.definition}
            className="bg-green-600 py-[9px] pl-10 mt-4"
          />
        )}
      </div>
    </>
  );
}
