export type GetWordExamplesResult = {
  examples?: string[];
  message?: string;
};

export type DeleteExampleResult =
  | {
      message?: string;
    }
  | undefined;
