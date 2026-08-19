'use server';

import OpenAI from 'openai';
import { sql } from '@/app/lib/db';
import { fetchCourse, fetchExamples } from '../data';
import {
  DeleteExampleResult,
  GetWordExamplesRawProps,
  GetWordExamplesRawResult,
  GetWordExamplesResult,
  SuggestTranslationProps,
  SuggestTranslationResult,
} from '../types';
import { EXAMPLE_AI_REQUEST_COUNT, OPENAI_MODEL } from '../../constants';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { getI18n } from '@/app/lib/i18n/get-i18n';

let client: OpenAI | undefined;
try {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (e) {
  console.error('Error initializing OpenAI: ', e);
}

const DEFAULT_OPENAI_OPTIONS: OpenAI.RequestOptions = {
  timeout: 15 * 1000,
  maxRetries: 3,
};

export async function insertExamples(
  wordId: string,
  examples: string[],
): Promise<{
  message?: string;
}> {
  try {
    const promises = examples.map((example) =>
      sql.query(
        `INSERT INTO examples (word_id, example)
                   VALUES ($1, $2)
                   RETURNING *
                  `,
        [wordId, example],
      ),
    );
    await Promise.allSettled(promises);
    return {
      /* So far no need for the IDs */
    };
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to insert examples'),
    };
  }
}

export async function deleteWordExample(
  wordId: string,
  example: string,
): Promise<DeleteExampleResult> {
  try {
    await sql.query(`DELETE FROM examples WHERE word_id = $1 AND example = $2`, [
      wordId,
      example,
    ]);
    return undefined;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to delete example'),
    };
  }
}

const getLLMResponse = async (prompt: string): Promise<string | { message: string }> => {
  const { t } = await getI18n();
  if (!client) {
    return {
      message: t('errors.openaiNotInitialized'),
    };
  }

  const response = await client.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a language teacher.' },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    DEFAULT_OPENAI_OPTIONS,
  );
  const content = response.choices[0].message.content?.trim();
  if (!content) {
    return {
      message: t('errors.openaiNoContent'),
    };
  }
  return content;
};

export async function getWordExamples(wordId: string): Promise<GetWordExamplesResult> {
  const { t } = await getI18n();
  if (!client) {
    return {
      message: t('errors.openaiNotInitialized'),
    };
  }

  if (!wordId) {
    return {
      message: t('errors.wordIdRequired'),
    };
  }

  const wordWithExamples = await fetchExamples({ wordId });
  if (!wordWithExamples) {
    return {
      message: t('errors.wordNotFound', { id: wordId }),
    };
  }

  const course = await fetchCourse(wordWithExamples.courseId);
  if (!course) {
    return {
      message: t('errors.courseNotFoundForWord', {
        courseId: wordWithExamples.courseId,
        wordId,
      }),
    };
  }

  if (wordWithExamples.examples.length > 0) {
    console.log(
      'Reusing examples from DB for word: ',
      wordWithExamples.word,
      wordId,
      '. Count: ',
      wordWithExamples.examples.length,
    );

    return {
      examples: wordWithExamples.examples,
    };
  }

  console.log('Fetching examples for word: ', {
    word: wordWithExamples.word,
    id: wordWithExamples.id,
    languageCode: course.courseCode,
  });
  const examplesResponse = await getLLMResponse(`
        Generate ${EXAMPLE_AI_REQUEST_COUNT} examples of using the expression "${wordWithExamples.word}"
        in ${course.learningLang} language (ISO code ${course.courseCode}).
        The examples should cover the most commonly used meanings of that expression.
        Do not produce any other text, just the ${EXAMPLE_AI_REQUEST_COUNT} sentences.
        Avoid using numbers at the beginning of the rows.
        Put every example on a new line.
        `);
  if (typeof examplesResponse === 'object') {
    return examplesResponse;
  }
  const examples = examplesResponse.split('\n').map((e) => e.trim());
  console.log('examples: ', examples);

  console.log('Fetching synonyms for word: ', {
    word: wordWithExamples.word,
    id: wordWithExamples.id,
    languageCode: course.courseCode,
  });
  const synonymsResponse = await getLLMResponse(`
        Give me up to three synonyms of the expression "${wordWithExamples.word}"
        in ${course.learningLang} language (ISO code ${course.courseCode}).
        Do not produce any other text, just the synonyms.
        Avoid using numbers at the beginning of the rows.
        Put every synonym on a new line.
        `);
  let synonyms: string[] = [];
  if (typeof synonymsResponse !== 'object') {
    synonyms = synonymsResponse.split('\n').map((e) => e.trim());
    console.log('synonyms: ', synonyms);
  }

  const allExamples = [...examples, ...synonyms];
  await insertExamples(wordId, allExamples);

  return {
    examples: allExamples,
  };
}

export async function getWordExamplesRaw({
  word,
  courseId,
}: GetWordExamplesRawProps): Promise<GetWordExamplesRawResult> {
  const { t } = await getI18n();
  if (!client) {
    return {
      message: t('errors.openaiNotInitialized'),
    };
  }

  if (!word) {
    return {
      message: t('errors.wordRequired'),
    };
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return {
      message: t('errors.courseNotFound', { id: courseId }),
    };
  }

  console.log('Fetching examples for word: ', {
    word,
    languageCode: course.courseCode,
  });
  const examplesResponse = await getLLMResponse(`
        Generate ${EXAMPLE_AI_REQUEST_COUNT} examples of using the expression "${word}"
        in ${course.learningLang} language (ISO code ${course.courseCode}).
        The examples should cover the most commonly used meanings of that expression.
        Do not produce any other text, just the ${EXAMPLE_AI_REQUEST_COUNT} sentences.
        Avoid using numbers at the beginning of the rows.
        Put every example on a new line.
        `);
  if (typeof examplesResponse === 'object') {
    return examplesResponse;
  }
  const examples = examplesResponse.split('\n').map((e) => e.trim());
  console.log('examples: ', examples);

  console.log('Fetching synonyms for word: ', {
    word,
    languageCode: course.courseCode,
  });
  const synonymsResponse = await getLLMResponse(`
        Give me up to three synonyms of the expression "${word}"
        in ${course.learningLang} language (ISO code ${course.courseCode}).
        Do not produce any other text, just the synonyms.
        Avoid using numbers at the beginning of the rows.
        Put every synonym on a new line.
        `);
  let synonyms: string[] = [];
  if (typeof synonymsResponse !== 'object') {
    synonyms = synonymsResponse.split('\n').map((e) => e.trim());
    console.log('synonyms: ', synonyms);
  }

  const allExamples = [...examples, ...synonyms];

  return {
    examples: allExamples,
  };
}
export async function suggestTranslation({
  word,
  courseId,
}: SuggestTranslationProps): Promise<SuggestTranslationResult> {
  const { t } = await getI18n();
  if (!client) {
    return {
      message: t('errors.openaiNotInitialized'),
    };
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return {
      message: t('errors.courseNotFoundDot', { id: courseId }),
    };
  }

  console.log('Requesting translation for word ', word);

  const prompt = `
  Translate "${word}" from ${course.learningLang} to ${course.knownLang}, each meaning on new line, no extra text or symbols.
  `;
  const response = await client.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a dictionary.' },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    DEFAULT_OPENAI_OPTIONS,
  );

  const content = response.choices[0].message.content?.trim();
  console.log('Received translation content: ', content);
  if (!content) {
    return {
      message: t('errors.openaiNoContent'),
    };
  }

  const translations = content.split('\n').map((e) => e.trim());
  const translationsDeduplicated = Array.from(
    new Map(
      translations
        .filter((line) => line.length > 0)
        .map((line) => [line.toLowerCase(), line]),
    ).values(),
  );

  return {
    translations: translationsDeduplicated,
  };
}

export async function reverseTranslation({
  word,
  courseId,
}: SuggestTranslationProps): Promise<SuggestTranslationResult> {
  const { t } = await getI18n();
  if (!client) {
    return {
      message: t('errors.openaiNotInitialized'),
    };
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return {
      message: t('errors.courseNotFoundDot', { id: courseId }),
    };
  }

  console.log('Requesting reverse translation for word ', word);

  const prompt = `
  Translate "${word}" from ${course.knownLang} to ${course.learningLang}, each meaning on new line, no extra text or symbols.
  `;
  const response = await client.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a dictionary.' },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    DEFAULT_OPENAI_OPTIONS,
  );

  const content = response.choices[0].message.content?.trim();
  console.log('Received reverse translation content: ', content);
  if (!content) {
    return {
      message: t('errors.openaiNoContent'),
    };
  }

  const translations = content.split('\n').map((e) => e.trim());
  const translationsDeduplicated = Array.from(
    new Map(
      translations
        .filter((line) => line.length > 0)
        .map((line) => [line.toLowerCase(), line]),
    ).values(),
  );

  return {
    translations: translationsDeduplicated,
  };
}

export const queryReverseTranslation = async (args: SuggestTranslationProps) => {
  'use server';
  try {
    return await reverseTranslation(args);
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Error in queryReverseTranslation'),
    };
  }
};

export const queryExamples = async (wordId: string) => {
  'use server';
  return await getWordExamples(wordId);
};

export const queryExamplesRaw = async (args: GetWordExamplesRawProps) => {
  'use server';
  return await getWordExamplesRaw(args);
};

export const deleteExample = async (wordId: string, example: string) => {
  'use server';
  return await deleteWordExample(wordId, example);
};

export const queryTranslations = async (args: SuggestTranslationProps) => {
  'use server';
  try {
    return await suggestTranslation(args);
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Error in queryTranslations'),
    };
  }
};
