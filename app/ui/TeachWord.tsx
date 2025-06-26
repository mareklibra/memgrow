import { useMemo, useState } from 'react';

import { Word, WordWithMeta } from '@/app/lib/definitions';
import { TypeTranslation, TypeTranslationProps } from './TypeTranslation';
import { ShowWord } from './ShowWord';
import { Button } from './button';
import { FieldStatus } from './types';
import { WordProgress } from './WordProgress';
import { ChooseTranslation } from './ChooseTranslation';
import { EditWords, EditWordsProps } from './EditWords';

const DELAY_MISTAKE_MS = 3 * 1000;
const DELAY_CORRECT_MS = 1 * 1000;
interface TeachWordProps {
  word: WordWithMeta;
  stepsDone: number;
  stepsTotal: number;
  correct: (word: WordWithMeta) => void;
  mistake: (word: WordWithMeta) => void;
  repeatSooner: (word: Word) => void;
  onChange: EditWordsProps['onChange'];
  specialKeys: TypeTranslationProps['specialKeys'];
}

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function TeachWord({
  word,
  correct,
  mistake,
  onChange,
  repeatSooner,
  specialKeys,
}: Readonly<TeachWordProps>) {
  const [status, setStatus] = useState<FieldStatus>('normal');
  const [isAnyText, setIsAnyText] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const otherWordOptions = useMemo(
    () => (word.similarWords || []).map((w) => w.word),
    [word.similarWords],
  );
  const otherDefinitionOptions = useMemo(
    () => (word.similarWords || []).map((w) => w.definition),
    [word.similarWords],
  );
  const threeWordOptions = useMemo(
    () => otherWordOptions.slice(0, 3),
    [otherWordOptions],
  );
  const threeDefinitionOptions = useMemo(
    () => otherDefinitionOptions.slice(0, 3),
    [otherDefinitionOptions],
  );
  const sevenDefinitionOptions = useMemo(
    () => otherDefinitionOptions.slice(0, 7),
    [otherDefinitionOptions],
  );

  const onValue = async (value: string, oneChanceOnly: boolean) => {
    setIsAnyText(!!value);

    if (
      ['choose_4_def', 'choose_8_def'].includes(word.form) &&
      value === word.definition
    ) {
      setStatus('correct');
      await delay(DELAY_CORRECT_MS);
      correct(word);
      return;
    }

    if (
      ['choose_4_word', 'write', 'write_last'].includes(word.form) &&
      value === word.word
    ) {
      setStatus('correct');
      await delay(DELAY_CORRECT_MS);
      correct(word);
      return;
    }

    if (oneChanceOnly) {
      await forceCheck();
    }
  };

  const forceCheck = async () => {
    if (word.form === 'show') {
      setStatus('correct');
      correct(word);
      return;
    }

    // the value has been checked in onValue(), no need to repeat
    setStatus('mistake');
    await delay(DELAY_MISTAKE_MS);
    mistake(word);
  };

  const editWord = () => {
    setIsEdit(!isEdit);
  };

  const handleOnChange = (word: Word) => {
    if (onChange) {
      onChange(word);
    }
    setIsEdit(false);
  };

  let component;
  switch (word.form) {
    case 'show':
      component = <ShowWord word={word} />;
      break;
    case 'choose_4_def':
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
    case 'choose_4_word':
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
    case 'choose_8_def':
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
    case 'write':
    default:
      component = (
        <TypeTranslation
          key={word.id}
          word={word}
          onValue={onValue}
          status={status}
          specialKeys={specialKeys}
        />
      );
  }

  const isCheckButtonDisabled = !(
    status === 'normal' &&
    (isAnyText || word.form === 'show')
  );

  const isLearning = word.memLevel === 0;

  return (
    <form>
      <div className="flex flex-col" id="teach-word">
        <div>{component}</div>
        <div className="py-[20px]">
          <WordProgress word={word} />
        </div>
        <div className="py-[20px] flex justify-between">
          <Button onClick={editWord} type="button">
            Edit
          </Button>

          {!isLearning && (
            <Button onClick={() => repeatSooner(word)} type="button">
              Repeat sooner
            </Button>
          )}

          <Button onClick={forceCheck} disabled={isCheckButtonDisabled} type="submit">
            {word.form === 'show' ? 'Next' : 'Check'}
          </Button>
        </div>
        {isEdit && (
          <EditWords
            words={[word]}
            courseId={word.courseId}
            reduced
            onChange={handleOnChange}
          />
        )}
      </div>
    </form>
  );
}
