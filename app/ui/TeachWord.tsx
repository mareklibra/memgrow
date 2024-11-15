import { useMemo, useState } from "react";

import { WordWithMeta } from "@/app/lib/definitions";
import { TypeTranslation } from "./TypeTranslation";
import { ShowWord } from "./ShowWord";
import { Button } from "./button";
import { FieldStatus } from "./types";
import { WordProgress } from "./WordProgress";
import { ChooseTranslation } from "./ChooseTranslation";

const DELAY_MISTAKE_MS = 3 * 1000;
const DELAY_CORRECT_MS = 1 * 1000;
interface TeachWordProps {
  word: WordWithMeta;
  stepsDone: number;
  stepsTotal: number;
  correct: (word: WordWithMeta) => void;
  mistake: (word: WordWithMeta) => void;
}

const delay = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function TeachWord({ word, correct, mistake }: TeachWordProps) {
  const [status, setStatus] = useState<FieldStatus>("normal");
  const [isAnyText, setAnyText] = useState<boolean>(false);
  const otherOptions = useMemo(
    // TODO: read dynamically based on similarity
    () => ["foo", "bar", "buz", "aaaa", "bbb", "ccccc", "dddd", "eeee", "ffff"],
    []
  );
  const threeOptions = useMemo(() => otherOptions.slice(0, 3), [otherOptions]);
  const sevenOptions = useMemo(() => otherOptions.slice(0, 7), [otherOptions]);

  const onValue = async (value: string, oneChanceOnly: boolean) => {
    setAnyText(!!value);

    if (value === word.definition) {
      setStatus("correct");
      await delay(DELAY_CORRECT_MS);
      correct(word);
      return;
    }

    if (oneChanceOnly) {
      await forceCheck();
    }
  };

  const forceCheck = async () => {
    if (word.form === "show") {
      setStatus("correct");
      correct(word);
      return;
    }

    // the value has been checked in onValue(), no need to repeat
    setStatus("mistake");
    await delay(DELAY_MISTAKE_MS);
    mistake(word);
  };

  let component;
  switch (word.form) {
    case "show":
      component = <ShowWord word={word} />;
      break;
    case "choose_4":
      component = (
        <ChooseTranslation
          key={word.id}
          word={word}
          onValue={onValue}
          status={status}
          otherOptions={threeOptions}
        />
      );
      break;
    case "choose_8":
      component = (
        <ChooseTranslation
          key={word.id}
          word={word}
          onValue={onValue}
          status={status}
          otherOptions={sevenOptions}
        />
      );
      break;
    case "write":
    default:
      component = (
        <TypeTranslation
          key={word.id}
          word={word}
          onValue={onValue}
          status={status}
        />
      );
  }

  const isCheckButtonDisabled = !(
    status === "normal" &&
    (isAnyText || word.form === "show")
  );

  return (
    <div className="flex flex-col">
      <form>
        <div>{component}</div>
        <div className="py-[20px] pl-10 pr-10 flex justify-between">
          <WordProgress word={word} />
          <Button
            onClick={forceCheck}
            disabled={isCheckButtonDisabled}
            type="submit"
          >
            {word.form === "show" ? "Next" : "Check"}
          </Button>
        </div>
      </form>
    </div>
  );
}
