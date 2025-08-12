export type GetWordExamplesResult = {
  examples?: string[];
  message?: string;
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
