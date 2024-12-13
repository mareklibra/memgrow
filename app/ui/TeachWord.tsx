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
  const otherWordOptions = useMemo(
    () => (word.similarWords || []).map((w) => w.word),
    [word.similarWords]
  );
  const otherDefinitionOptions = useMemo(
    () => (word.similarWords || []).map((w) => w.definition),
    [word.similarWords]
  );
  const threeWordOptions = useMemo(() => otherWordOptions.slice(0, 3), [otherWordOptions]);
  const threeDefinitionOptions = useMemo(() => otherDefinitionOptions.slice(0, 3), [otherDefinitionOptions]);
  const sevenDefinitionOptions = useMemo(() => otherDefinitionOptions.slice(0, 7), [otherDefinitionOptions]);

  const onValue = async (value: string, oneChanceOnly: boolean) => {
    setAnyText(!!value);

    if (['choose_4_def', 'choose_8_def'].includes(word.form) && value === word.definition) {
      setStatus("correct");
      await delay(DELAY_CORRECT_MS);
      correct(word);
      return;
    }

    if ('choose_4_word' === word.form && value === word.word) {
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
  console.log('----- current form: ', word.form);
  switch (word.form) {
    case "show":
      component = <ShowWord word={word} />;
      break;
    case "choose_4_def":
      component = (
        <ChooseTranslation
          key={word.id}
          toGuess={word.word}
          correctResponse={word.definition}
          otherOptions={threeDefinitionOptions}
          onValue={onValue}
          status={status}
        />
      );
      break;
    case "choose_4_word":
      component = (
        <ChooseTranslation
          key={word.id}
          toGuess={word.definition}
          correctResponse={word.word}
          otherOptions={threeWordOptions}
          onValue={onValue}
          status={status}
        />
      );
      break;
    case "choose_8_def":
      component = (
        <ChooseTranslation
          key={word.id}
          toGuess={word.word}
          correctResponse={word.definition}
          otherOptions={sevenDefinitionOptions}
          onValue={onValue}
          status={status}
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
