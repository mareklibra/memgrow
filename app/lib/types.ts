import { Word } from './definitions';

export type GetWordExamplesResult = {
  examples?: string[];
  message?: string;
};

export type GetWordExamplesRawResult = GetWordExamplesResult;

export type GetWordExamplesRawProps = {
  word: string;
  courseId: string;
};

export type DeleteExampleResult =
  | {
      message?: string;
    }
  | undefined;

export type SuggestTranslationProps = {
  word: string;
  courseId: string;
};

export type SuggestTranslationResult = {
  translations?: string[];
  message?: string;
};

export type UpdateWordResult =
  | undefined
  | {
      message?: string;
      id?: Word['id'];
    };

export type UpdateWordsResult =
  | undefined
  | {
      message?: string;
      failedWordIds?: Word['id'][];
    };

export type WordWithSimilarity = Word & { similarity: number };

export type GenerateImageResult = {
  message?: string;
  imageId?: string;
};

export type DeleteImageResult =
  | {
      message?: string;
    }
  | undefined;

export type WordImageSummary = {
  wordId: string;
  word: string;
  definition: string;
  imageCount: number;
  requested: boolean;
  inProgress: boolean;
};
