'use server';

import OpenAI from 'openai';
import { sql } from '@vercel/postgres';
import { fetchCourse, fetchExamples } from '../data';
import {
  DeleteExampleResult,
  GetWordExamplesResult,
  SuggestTranslationProps,
  SuggestTranslationResult,
} from '../types';
import { EXAMPLE_AI_REQUEST_COUNT, OPENAI_MODEL } from '../../constants';

let client: OpenAI | undefined;
try {
  client = new OpenAI();
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
      message: `Database Error: Failed to insert new example. ${JSON.stringify(e)}`,
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
      message: `Database Error: Failed to delete example. ${JSON.stringify({ wordId, example, e })}`,
    };
  }
}

export async function getWordExamples(wordId: string): Promise<GetWordExamplesResult> {
  if (!client) {
    return {
      message: 'OpenAI Client not initialized',
    };
  }

  if (!wordId) {
    return {
      message: 'wordId is required',
    };
  }

  const wordWithExamples = await fetchExamples({ wordId });
  if (!wordWithExamples) {
    return {
      message: `Word not found, id: ${wordId}`,
    };
  }

  const course = await fetchCourse(wordWithExamples.courseId);
  if (!course) {
    return {
      message: `Course not found, id: ${wordWithExamples.courseId} for word: ${wordId}`,
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

  const prompt = `
        Generate three ${EXAMPLE_AI_REQUEST_COUNT} examples of using the expression "${wordWithExamples.word}"
        in ${course.learningLang} language (ISO code ${course.courseCode}).
        The examples should cover the most commonly used meanings of that expression.
        Do not produce any other text, just the three sentences.
        Avoid using numbers at the beginning of the rows.
        Put every example on a new line.
        `;

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
      message: 'No content returned from OpenAI',
    };
  }
  const examples = content.split('\n').map((e) => e.trim());
  console.log('examples: ', examples);

  await insertExamples(wordId, examples);

  return {
    examples,
  };
}

export async function suggestTranslation({
  word,
  courseId,
}: SuggestTranslationProps): Promise<SuggestTranslationResult> {
  if (!client) {
    return {
      message: 'OpenAI Client not initialized',
    };
  }

  const course = await fetchCourse(courseId);
  if (!course) {
    return {
      message: `Course not found, id: ${courseId}.`,
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
      message: 'No content returned from OpenAI',
    };
  }

  const translations = content.split('\n').map((e) => e.trim());
  const translationsDeduplicated = Array.from(
    new Map(
      translations.filter((t) => t.length > 0).map((t) => [t.toLowerCase(), t]),
    ).values(),
  );

  return {
    translations: translationsDeduplicated,
  };
}

export const queryExamples = async (wordId: string) => {
  'use server';
  return await getWordExamples(wordId);
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
    console.error('Error in queryTranslations: ', e);
    return {
      message: `Error in queryTranslations: ${JSON.stringify(e)}`,
    };
  }
};
