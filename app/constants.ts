export const testWordsCountLimit = 25; // keep at 10
export const testWordsCountLimitOffline = 500; // Keep at 500 for testing
export const testRepetitionLimit = 1; // keep at 1
export const testBatchLimit = testWordsCountLimit * 2;
export const testBatchLimitOffline = testWordsCountLimitOffline * 2;

export const maxDistanceForRandomQueueInsertion = 10;

export const learnWordsCountLimit = 7;
export const learnWordsCountLimitOffline = 30;
export const learnRepetitionLimit = 3;
export const learnRepetitionLimitOffline = 4;
export const learnBatchLimit = 23;
export const learnBatchLimitOffline =
  learnWordsCountLimitOffline * (learnRepetitionLimitOffline + 1) + 1;

export const DELAY_MISTAKE_MS = 3 * 1000;
export const DELAY_CORRECT_MS = 1 * 700;

export const maxSimilarWords = 7;
export const CONFIRM_DELAY_MS = 1000;

export const DAY_MS = 60 * 60 * 24 * 1000;

export const STRING_SIMILARITY_SUBSTRING_LENGTH = 2;

export const SUCCESS_INCREASE = 1.5;
export const MAX_MEM_LEVEL = 4 * 30; // 4 months

export const SEARCH_DELAY_MS = 500;

// export const OPENAI_MODEL = 'gpt-5-nano'; // 'gpt-4.1-nano';
export const OPENAI_MODEL = 'gpt-4.1-nano'; // 'gpt-4.1-nano';
export const EXAMPLE_AI_REQUEST_COUNT = 'three (3)';
