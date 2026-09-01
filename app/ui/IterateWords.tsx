'use client';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { lusitana } from '@/app/ui/fonts';
import { cn, s } from '@/app/ui/styles';
import Link from 'next/link';
import { Button, Spinner } from '@/app/lib/material-tailwind-compat';
import { decreaseMemLevel } from '@/app/lib/word-transitions';
import { Word, WordWithMeta } from '@/app/lib/definitions';
import { updateWordsProgress } from '@/app/lib/actions';
import { UpdateWordsResult } from '@/app/lib/types';
import {
  calculateProgress,
  checkIsDone,
  computeNewMemLevel,
  gatherPassedProgress,
  handleCorrect,
  handleMistake,
  handleOnChange,
  handleSkipWord,
  initializeQueue,
} from '@/app/lib/iterate-words-logic';
import {
  getBatchKey,
  getPendingBatchesServerSnapshot,
  getPendingBatchesSnapshot,
  savePendingBatch,
  subscribePendingBatches,
} from '@/app/lib/pending-batch';
import { TeachWord } from './TeachWord';
import { DoneState } from './DoneState';
import {
  BatchBanner,
  usePendingBatchContext,
  type PendingResolveAction,
} from './PendingBatchRecovery';
import { TypeTranslationProps } from './TypeTranslation';
import {
  learnBatchLimit,
  learnBatchLimitOffline,
  MAX_MEM_LEVEL,
  maxDistanceForRandomQueueInsertion,
  testBatchLimit,
  testBatchLimitOffline,
} from '../constants';
import { WordExamplesProps } from './WordExamples';
import { WordPicturesProps } from './WordPictures';
import { DonutProgressChart } from './DonutProgressChart';
import { RequestImageResult } from '../lib/types';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import type { TFunction } from '@/app/lib/i18n';

const subscribeIsClient = () => () => {};

function useSessionBackupGate(
  batchKey: string,
  persistCourseId: string | undefined,
  isLearning: boolean | undefined,
  t: TFunction,
) {
  const { claim, unclaim } = usePendingBatchContext();
  const isClient = useSyncExternalStore(
    subscribeIsClient,
    () => true,
    () => false,
  );
  const { batches } = useSyncExternalStore(
    subscribePendingBatches,
    getPendingBatchesSnapshot,
    getPendingBatchesServerSnapshot,
  );
  const [unlocked, setUnlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localStorageError, setLocalStorageError] = useState<string | null>(null);

  const pending = batchKey ? (batches.find((b) => b.key === batchKey) ?? null) : null;
  const hasPending = !!(pending && pending.words.length > 0);

  // Adjusting state during render (React-sanctioned pattern, not an effect):
  // once there's nothing left to resume, latch "unlocked" so the session
  // stays open even if a pending batch reappears later (e.g. another tab).
  // Guarded by `!unlocked` so it fires at most once and can't loop.
  if (isClient && !hasPending && !unlocked) {
    setUnlocked(true);
  }

  const sessionOpen = isClient && !refreshing && (unlocked || !hasPending);

  // Must be useLayoutEffect, not useEffect: claiming here flips
  // PendingBatchProvider's claimedKeys before the browser paints, hiding
  // this batch from the global <PendingBatchRecovery/> banner in the same
  // commit that renders our own inline BatchBanner below. useEffect would
  // let both banners paint for a frame before the claim takes effect.
  useLayoutEffect(() => {
    if (!batchKey) return;
    claim(batchKey);
    return () => unclaim(batchKey);
  }, [batchKey, claim, unclaim]);

  const persistPassed = useCallback(
    (queue: WordWithMeta[], idx: number) => {
      if (!persistCourseId) return;
      const passed = gatherPassedProgress(queue, idx);
      if (passed.length === 0) return;
      const ok = savePendingBatch({
        words: passed,
        courseId: persistCourseId,
        isLearning: !!isLearning,
        timestamp: Date.now(),
      });
      setLocalStorageError(ok ? null : t('errors.localStorageSave'));
    },
    [persistCourseId, isLearning, t],
  );

  const onBannerDone = useCallback((_key: string, action: PendingResolveAction) => {
    if (action === 'save') {
      setRefreshing(true);
      window.location.reload();
    }
  }, []);

  return {
    sessionOpen,
    showSpinner: refreshing || !isClient,
    blockedBatch: hasPending && !unlocked ? pending : null,
    localStorageError,
    persistPassed,
    onBannerDone,
  };
}

interface IterateWordsProps {
  words: Word[];
  repetitionLimit: number;
  isLearning?: boolean;
  title: string;
  specialKeys: TypeTranslationProps['specialKeys'];
  isOffline: boolean;
  queryExamples: WordExamplesProps['queryExamples'];
  deleteExample: WordExamplesProps['deleteExample'];
  queryImages: WordPicturesProps['queryImages'];
  deleteImage: WordPicturesProps['deleteImage'];
  requestImageGeneration: (wordId: string) => Promise<RequestImageResult>;
}

export function IterateWords({
  words,
  repetitionLimit,
  isLearning,
  title,
  specialKeys,
  isOffline,
  queryExamples,
  deleteExample,
  queryImages,
  deleteImage,
  requestImageGeneration,
}: Readonly<IterateWordsProps>) {
  const { t } = useTranslation();
  const courseId = words[0]?.courseId;
  const batchKey = courseId ? getBatchKey(courseId, !!isLearning) : '';
  const {
    sessionOpen,
    showSpinner,
    blockedBatch,
    localStorageError,
    persistPassed,
    onBannerDone,
  } = useSessionBackupGate(batchKey, courseId, isLearning, t);
  const [wordQueue, setWordQueue] = useState<WordWithMeta[]>([]);
  const [wordIdx, setWordIdx] = useState<number>(-1);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [previewMemLevel, setPreviewMemLevel] = useState<number | null>(null);
  const previewMemLevelRef = useRef<number | null>(null);

  let maxWordsInBatch = isOffline ? testBatchLimitOffline : testBatchLimit;
  if (isLearning) {
    maxWordsInBatch = isOffline ? learnBatchLimitOffline : learnBatchLimit;
  }

  useEffect(() => {
    window.onbeforeunload = confirmExit;
    function confirmExit() {
      return t('learn.beforeUnload');
    }
    return () => {
      window.onbeforeunload = null;
    };
  }, [t]);

  useEffect(() => {
    if (!sessionOpen) return;
    if (words.length === 0) return;

    if (wordQueue.length === 0) {
      queueMicrotask(() => {
        const initial = initializeQueue(words);
        setWordQueue(initial.wordQueue);
        setWordIdx(initial.wordIdx);
      });
    }
  }, [sessionOpen, words, wordQueue]);

  useEffect(() => {
    if (!sessionOpen) return;
    if (checkIsDone(wordIdx, wordQueue.length, maxWordsInBatch)) {
      queueMicrotask(() => setIsDone(true));
    }
  }, [sessionOpen, wordIdx, wordQueue.length, maxWordsInBatch]);

  const resetPreview = () => {
    setPreviewMemLevel(null);
    previewMemLevelRef.current = null;
  };

  const correct = (word: WordWithMeta) => {
    const newState = handleCorrect({ wordQueue, wordIdx }, word, {
      isLearning: !!isLearning,
      repetitionLimit,
      maxDistForRandom: maxDistanceForRandomQueueInsertion,
      overrideMemLevel: previewMemLevelRef.current ?? undefined,
    });
    resetPreview();
    persistPassed(newState.wordQueue, newState.wordIdx);
    setWordQueue(newState.wordQueue);
    setWordIdx(newState.wordIdx);
  };

  const mistake = (word: WordWithMeta, isShortenOnly: boolean) => {
    const newState = handleMistake({ wordQueue, wordIdx }, word, {
      isLearning: !!isLearning,
      isShortenOnly,
      overrideMemLevel: previewMemLevelRef.current ?? undefined,
    });
    resetPreview();
    persistPassed(newState.wordQueue, newState.wordIdx);
    setWordQueue(newState.wordQueue);
    setWordIdx(newState.wordIdx);
  };

  const previewNewLevel = useCallback(
    (isCorrect: boolean, isShortenOnly?: boolean) => {
      if (wordIdx < 0 || wordIdx >= wordQueue.length) return;
      const w = wordQueue[wordIdx];
      const level = computeNewMemLevel(w, isCorrect, {
        isLearning: !!isLearning,
        isShortenOnly,
      });
      previewMemLevelRef.current = level;
      setPreviewMemLevel(level);
    },
    [wordQueue, wordIdx, isLearning],
  );

  const onChange = useCallback(
    (word: Word) => {
      setWordQueue(handleOnChange(wordQueue, word));
    },
    [wordQueue],
  );

  const skipWord = useCallback(
    (word: Word) => {
      console.log('skipWord', word);
      const newState = handleSkipWord({ wordQueue, wordIdx }, word);
      resetPreview();
      persistPassed(newState.wordQueue, newState.wordIdx);
      setWordQueue(newState.wordQueue);
      setWordIdx(newState.wordIdx);
    },
    [wordIdx, wordQueue, persistPassed],
  );

  const onLeave = () => {
    // Subsequently, the DoneState will save the progress
    setIsDone(true);
  };

  const repeatSooner = (word: Word) => {
    onChange({ ...word, memLevel: decreaseMemLevel(word.memLevel, true) });
  };

  const handlePriority = (word: Word) => {
    onChange({ ...word, isPriority: !word.isPriority });
  };

  const storeProgress = async (progressWords: Word[]): Promise<UpdateWordsResult> => {
    try {
      return await updateWordsProgress(progressWords);
    } catch (error) {
      console.error('Failed to call updateWordsProgress action: ', error);
      return {
        message: t('learn.persistFailedAction'),
        failedWordIds: progressWords.map((w) => w.id),
      };
    }
  };

  if (showSpinner) {
    return (
      <div className={cn(s.centered, 'p-4')}>
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (blockedBatch) {
    return (
      <div className="p-2">
        <BatchBanner batch={blockedBatch} onDone={onBannerDone} />
      </div>
    );
  }

  if (!words.length) {
    return (
      <div>
        {t('learn.nothingMore')}
        <Link href="/test">{t('nav.test')}</Link>
      </div>
    );
  }

  if (isDone) {
    return (
      <DoneState
        words={words}
        wordQueue={wordQueue}
        storeProgress={storeProgress}
        isLearning={isLearning}
      />
    );
  }

  if (wordIdx < 0 || wordIdx >= wordQueue.length) {
    return undefined;
  }

  const word = wordQueue[wordIdx];

  const progress = calculateProgress(wordIdx, wordQueue.length, maxWordsInBatch);

  return (
    <div className="w-full p-1 md:p-2 md:pt-5">
      {localStorageError && (
        <div className="mx-auto mt-2 max-w-xl rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {localStorageError}
        </div>
      )}
      <h1
        className={cn(
          lusitana.className,
          s.pageTitle,
          'mb-1 md:mb-4 flex justify-between',
        )}
      >
        <DonutProgressChart
          label={t('learn.level')}
          progress={previewMemLevel ?? word.memLevel}
          max={MAX_MEM_LEVEL}
          suffix=""
          width={70}
          valueSize="12px"
        />
        <div className="flex items-center text-sm md:text-xl">
          {t('learn.titleWithCount', { title, count: words.length })}
        </div>
        <div className="flex gap-2 items-center">
          <DonutProgressChart
            label={t('learn.batch')}
            progress={progress}
            max={100}
            width={70}
            valueSize="12px"
          />
          <Button variant="outlined" onClick={onLeave}>
            X
          </Button>
        </div>
      </h1>

      <TeachWord
        key={wordIdx}
        word={word}
        onChange={onChange}
        correct={correct}
        mistake={mistake}
        repeatSooner={repeatSooner}
        handlePriority={handlePriority}
        stepsDone={wordIdx}
        stepsTotal={wordQueue.length}
        specialKeys={specialKeys}
        queryExamples={queryExamples}
        deleteExample={deleteExample}
        queryImages={queryImages}
        deleteImage={deleteImage}
        requestImageGeneration={requestImageGeneration}
        skipWord={skipWord}
        onPreviewMemLevel={previewNewLevel}
      />
    </div>
  );
}
