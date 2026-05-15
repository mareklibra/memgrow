import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { s } from '@/app/ui/styles';
import { Word, WordWithMeta } from '@/app/lib/definitions';
import {
  ArrowPathIcon,
  BoltIcon,
  BoltSlashIcon,
  CameraIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { TypeTranslation, TypeTranslationProps } from './TypeTranslation';
import { ShowWord } from './ShowWord';
import { Button } from './button';
import { FieldStatus } from './types';
import { ChooseTranslation } from './ChooseTranslation';
import { EditWordInline } from './EditWordInline';
import { useWithSound } from '../lib/useWithSound';
import { DELAY_CORRECT_MS, DELAY_MISTAKE_MS } from '../constants';
import { WordExamples, WordExamplesProps } from './WordExamples';
import { WordPictures, WordPicturesProps } from './WordPictures';
import { FORM_CORRECT_ANSWER } from '../lib/form-config';
import { assertNever } from '../lib/utils';
import { RequestImageResult } from '../lib/types';

interface TeachWordProps {
  word: WordWithMeta;
  stepsDone: number;
  stepsTotal: number;
  correct: (word: WordWithMeta) => void;
  mistake: (word: WordWithMeta, isShortenOnly: boolean) => void;
  repeatSooner: (word: Word) => void;
  handlePriority: (word: Word) => void;
  skipWord: (word: Word) => void;
  onChange?: (word: Word) => void;
  specialKeys: TypeTranslationProps['specialKeys'];
  queryExamples: WordExamplesProps['queryExamples'];
  deleteExample: WordExamplesProps['deleteExample'];
  queryImages: WordPicturesProps['queryImages'];
  deleteImage: WordPicturesProps['deleteImage'];
  requestImageGeneration: (wordId: string) => Promise<RequestImageResult>;
}

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function TeachWord({
  word,
  correct,
  mistake,
  onChange,
  repeatSooner,
  handlePriority,
  specialKeys,
  queryExamples,
  deleteExample,
  queryImages,
  deleteImage,
  requestImageGeneration,
  skipWord,
}: Readonly<TeachWordProps>) {
  const [status, setStatus] = useState<FieldStatus>('normal');
  const [isAnyText, setIsAnyText] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [audioSource, setAudioSource] = useState<string>();
  const { playSound } = useWithSound(audioSource);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [reply, setReply] = useState<number>(0);
  const [isSkipped, setIsSkipped] = useState<boolean>(word.isSkipped);
  const [imageRequested, setImageRequested] = useState(false);
  const [hasPictures, setHasPictures] = useState<boolean | null>(null);
  const skipMistakeRef = useRef<boolean>(false);

  const threeSimilarWords = useMemo(
    () => word.similarWords?.slice(0, 3) || [],
    [word.similarWords],
  );
  const sevenSimilarWords = useMemo(
    () => word.similarWords?.slice(0, 7) || [],
    [word.similarWords],
  );

  useEffect(() => {
    const runAsync = async () => {
      try {
        setIsPlaying(true);
        if (playSound) {
          await playSound();
        }
      } finally {
        setIsPlaying(false);
      }
    };
    runAsync();
  }, [playSound, reply]);

  const onValue = async (value: string, oneChanceOnly: boolean) => {
    setIsAnyText(!!value);

    const answerTarget = FORM_CORRECT_ANSWER[word.form];
    if (answerTarget) {
      const expected = answerTarget === 'word' ? word.word : word.definition;
      if (value?.trim().toLowerCase() === expected.trim().toLowerCase()) {
        setStatus('correct');
        await delay(DELAY_CORRECT_MS);
        correct(word);
        return;
      }
    }

    if (oneChanceOnly) {
      await forceCheck(value === '');
    }
  };

  const forceCheck = async (isShortenOnly?: boolean) => {
    if (isSkipped) {
      await delay(DELAY_CORRECT_MS);
      skipWord(word);
      return;
    }

    if (word.form === 'show') {
      setStatus('correct');
      await delay(DELAY_CORRECT_MS);
      correct(word);
      return;
    }

    // the value has been checked in onValue(), no need to repeat
    setStatus('mistake');
    skipMistakeRef.current = false;
    await delay(DELAY_MISTAKE_MS);

    if (skipMistakeRef.current) {
      mistake(word, true);
    } else {
      mistake(word, !!isShortenOnly);
    }
  };

  const editWord = () => {
    setIsEdit(!isEdit);
  };

  const handleOnChange = useCallback(
    (word: Word) => {
      if (onChange) {
        onChange(word);
      }
      setIsEdit(false);
    },
    [onChange],
  );

  const onRevertMistake = () => {
    skipMistakeRef.current = true;
  };

  let component;
  switch (word.form) {
    case 'show':
      component = <ShowWord status={status} word={word} onClick={forceCheck} />;
      break;
    case 'choose_4_def':
      component = (
        <ChooseTranslation
          key={word.id}
          guessing="definition"
          toGuess={word.word}
          correctResponse={word.definition}
          similarWords={threeSimilarWords}
          onValue={onValue}
          onRevertMistake={onRevertMistake}
          status={status}
        />
      );
      break;
    case 'choose_4_word':
      component = (
        <ChooseTranslation
          key={word.id}
          guessing="word"
          toGuess={word.definition}
          correctResponse={word.word}
          similarWords={threeSimilarWords}
          onValue={onValue}
          onRevertMistake={onRevertMistake}
          status={status}
        />
      );
      break;
    case 'choose_8_def':
      component = (
        <ChooseTranslation
          key={word.id}
          guessing="definition"
          toGuess={word.word}
          correctResponse={word.definition}
          similarWords={sevenSimilarWords}
          onValue={onValue}
          onRevertMistake={onRevertMistake}
          status={status}
        />
      );
      break;
    case 'write_mid':
    case 'write':
    case 'write_last':
      component = (
        <TypeTranslation
          key={word.id}
          word={word}
          onValue={onValue}
          status={status}
          specialKeys={specialKeys}
        />
      );
      break;
    default:
      assertNever(word.form);
  }

  const isCheckButtonDisabled = !(
    status === 'normal' &&
    (isAnyText || word.form === 'show' || isSkipped)
  );

  const isLearning = word.memLevel === 0;
  const isChooseForm = word.form.startsWith('choose_');

  const playPronunciation = () => {
    setAudioSource(`/api/sound/word/${word.courseId}/${word.id}`);
    setReply(reply + 1);
  };

  useEffect(() => {
    const checkImages = async () => {
      const result = await queryImages(word.id);
      setHasPictures((result.images?.length ?? 0) > 0);
    };
    checkImages();
  }, [word.id, queryImages]);

  const handleRequestImage = () => {
    setImageRequested(true);
    requestImageGeneration(word.id);
  };

  return (
    <form>
      <div className="flex flex-col" id="teach-word">
        {!isSkipped && (
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-11">{component}</div>
            <div className="col-span-1 flex flex-col justify-between items-center">
              {isChooseForm && (
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    onValue('', true);
                  }}
                  type="button"
                >
                  ?
                </Button>
              )}
              <Button onClick={playPronunciation} type="button" disabled={isPlaying}>
                <SpeakerWaveIcon className="w-5" />
              </Button>
              {!isLearning && (
                <Button onClick={() => repeatSooner(word)} type="button">
                  <ArrowPathIcon className="w-5" />
                </Button>
              )}
            </div>
          </div>
        )}
        {isSkipped && (
          <div className="text-center">
            The word will be skipped from your further learning.
          </div>
        )}

        <div className="py-5 w-full">
          <WordExamples
            word={word}
            queryExamples={queryExamples}
            deleteExample={deleteExample}
          />
        </div>

        <div className="flex flex-row justify-between">
          <Button onClick={() => handlePriority(word)} type="button">
            {word.isPriority ? (
              <>
                <BoltSlashIcon className="w-5" />
                &nbsp;Remove priority
              </>
            ) : (
              <>
                <BoltIcon className="w-5" />
                &nbsp;Set priority
              </>
            )}
          </Button>

          {!isSkipped && (
            <Button
              onClick={() => {
                setIsSkipped(true);
              }}
              type="button"
            >
              Skip from learning
            </Button>
          )}
          {isSkipped && (
            <Button
              onClick={() => {
                setIsSkipped(false);
              }}
              type="button"
            >
              Keep learning it
            </Button>
          )}
        </div>

        <hr className={s.separator} />

        <div className="flex justify-between">
          <Button onClick={editWord} type="button">
            Edit
          </Button>

          <Button
            onClick={() => forceCheck()}
            disabled={isCheckButtonDisabled}
            type="button"
          >
            {word.form === 'show' ? 'Next' : 'Check'}
          </Button>
        </div>

        {hasPictures && (
          <WordPictures
            wordId={word.id}
            queryImages={queryImages}
            deleteImage={deleteImage}
          />
        )}
        {hasPictures === false && (
          <div className="flex justify-center py-2">
            <Button
              onClick={handleRequestImage}
              type="button"
              disabled={imageRequested}
            >
              <CameraIcon className="w-5" />
            </Button>
          </div>
        )}

        {isEdit && (
          <EditWordInline word={word} onChange={handleOnChange} />
        )}
      </div>
    </form>
  );
}
