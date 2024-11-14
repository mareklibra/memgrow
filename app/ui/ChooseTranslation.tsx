import { Word } from "@/app/lib/definitions";
import { shuffleArray } from "@/app/lib/utils";
import { FieldStatus } from "./types";
import { WordStatic } from "./ShowWord";
import clsx from "clsx";
import { Button } from "./button";
import { useMemo, useState } from "react";

interface ChooseTranslationProps {
  word: Word;
  status: FieldStatus;
  onValue: (value: string, oneChanceOnly: boolean) => void;
  otherOptions: string[];
}

export function ChooseTranslation({
  word,
  onValue,
  status,
  otherOptions,
}: ChooseTranslationProps) {
  const [value, setValue] = useState<string>();
  const options = useMemo(() => {
    const array = [...otherOptions, word.definition];
    shuffleArray(array);
    return array;
  }, [otherOptions, word.definition]);

  const handleClick = (value: string) => {
    setValue(value);
    onValue(value, true);
  };

  return (
    <>
      <WordStatic word={word.word} />
      <div className="grid grid-cols-2 gap-6 w-3/4 justify-self-center">
        {options.map((item) => {
          return (
            <div key={item} className="">
              <Button
                key={item}
                className={clsx("justify-center w-full", {
                  "bg-green-600":
                    status !== "normal" && item === word.definition,
                  "bg-red-500": status === "mistake" && item === value,
                })}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item);
                }}
              >
                {item}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
