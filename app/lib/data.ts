import { stringSimilarity } from 'string-similarity-js';
import { sql } from '@vercel/postgres';
import { User } from 'next-auth';
import { auth } from '@/auth';
import { Course, DbCourse, DbWord, TeachingForm, Word } from '@/app/lib/definitions';
import { STRING_SIMILARITY_SUBSTRING_LENGTH } from '../constants';

type DbWordProgress = DbWord & {
  memlevel: number;
  form: TeachingForm;
  repeat_again: string;
  is_priority: boolean;
};
type UserAuth = User & { password: string };

export async function getUserForAuth(email: string): Promise<UserAuth | undefined> {
  try {
    const user = await sql<UserAuth>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

const fromDbWordProgress = (dbWord: DbWordProgress): Word => ({
  courseId: dbWord.course_id,
  id: dbWord.id,
  word: dbWord.word,
  definition: dbWord.definition,
  form: dbWord.form ?? 'show',
  memLevel: Number(dbWord.memlevel ?? '0'),
  repeatAgain: new Date(dbWord.repeat_again || Date.now()),
  isPriority: dbWord.is_priority ?? false,
});

const omDbCourse = (dbCourse: DbCourse): Course => ({
  id: dbCourse.id,
  name: dbCourse.name,
  knownLang: dbCourse.known_lang,
  learningLang: dbCourse.learning_lang,
  courseCode: dbCourse.course_code,
  total: dbCourse.total ?? 0,
  toLearn: -1,
  toTest: -1,
});

export type WordPronunciation = Pick<Word, 'id' | 'word' | 'definition'> & {
  audioSourceB64?: string;
};

export type WordExamples = Pick<Word, 'id' | 'word' | 'definition' | 'courseId'> & {
  examples: string[];
};

const omDbPronunciation = (
  dbWord: Pick<DbWord, 'id' | 'course_id' | 'word' | 'definition'> & {
    audio_source_base64?: string;
  },
): WordPronunciation => ({
  id: dbWord.id,
  word: dbWord.word,
  definition: dbWord.definition,
  audioSourceB64: dbWord.audio_source_base64,
});

const omDbExamples = (
  dbExamples: (Pick<DbWord, 'id' | 'course_id' | 'word' | 'definition'> & {
    example?: string;
  })[],
): WordExamples => ({
  id: dbExamples[0]['id'],
  courseId: dbExamples[0].course_id,
  word: dbExamples[0].word,
  definition: dbExamples[0].definition,
  examples: (dbExamples.map((e) => e.example).filter((e) => !!e) ?? []) as string[],
});

export async function fetchSimilarWords(
  courseId: string,
  words: Word[],
  limit: number,
): Promise<Word[]> {
  const allWords = await fetchAllWords(courseId);

  words.forEach((word) => {
    const candidates = allWords
      .filter((candidate) => candidate.word !== word.word)
      .map((candidate) => ({
        candidate,
        similarity: stringSimilarity(
          word.word,
          candidate.word,
          STRING_SIMILARITY_SUBSTRING_LENGTH,
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    word.similarWords = candidates.slice(0, limit).map((c) => c.candidate);
  });

  return words;
}

export async function fetchWordsToLearn(
  courseId: string,
  limit: number,
): Promise<Word[]> {
  try {
    const myAuth = await auth();
    console.log('Fetching words to learn by user: ', myAuth?.user?.name);

    const result = await sql<DbWordProgress>`
        SELECT words.course_id, words.id, words.word, words.course_id, words.definition,
               user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority
        FROM words
        LEFT OUTER JOIN
          (SELECT * FROM user_progress
           WHERE
             user_id = ${myAuth?.user?.id}
          ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.course_id = ${courseId}
          AND (user_progress.memlevel = 0 OR user_progress.memlevel is NULL)
        LIMIT ${limit}
        `;
    const data: Word[] = result.rows.map(fromDbWordProgress);
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch words to learn.');
  }
}

export async function fetchWordsToTest(
  courseId: string,
  limit: number,
  priorityFirst: boolean,
): Promise<Word[]> {
  try {
    const myAuth = await auth();

    const query = `
    SELECT words.course_id, words.id, words.word, words.course_id, words.definition,
           user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority
    FROM words
    LEFT OUTER JOIN
      (SELECT * FROM user_progress
       WHERE
       user_id = '${myAuth?.user?.id}'
     ) AS user_progress ON words.id = user_progress.word_id
    WHERE
      words.course_id = '${courseId}'
      AND (user_progress.memlevel > 0)
      AND (
        user_progress.repeat_again < NOW()
        OR (${priorityFirst} AND user_progress.is_priority = TRUE)
      )
    ORDER BY
      ${priorityFirst ? 'user_progress.is_priority DESC,' : ''}
      user_progress.repeat_again
    LIMIT ${limit}
    `;
    const result = await sql.query<DbWordProgress>(query);
    const data: Word[] = result.rows.map(fromDbWordProgress);
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch words to test.');
  }
}

export async function fetchAllWords(courseId: string): Promise<Word[]> {
  try {
    const myAuth = await auth();
    console.log(
      'Fetching all words for user: ',
      myAuth?.user?.name,
      ' and course: ',
      courseId,
    );

    const result = await sql<DbWordProgress>`
        SELECT
          words.course_id, words.id, words.word, words.definition,
          user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority
        FROM words
        LEFT OUTER JOIN
          (SELECT * FROM user_progress
           WHERE
           user_id = ${myAuth?.user?.id}
         ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.course_id = ${courseId}
        `;

    const data: Word[] = result.rows.map(fromDbWordProgress);
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all words.');
  }
}

export async function fetchWord(wordId: string): Promise<Word> {
  try {
    const myAuth = await auth();
    console.log('Fetching a single word for the user ', myAuth?.user?.name, ': ', wordId);

    const result = await sql<DbWordProgress>`
        SELECT
          words.course_id, words.id, words.word, words.definition,
          user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority
        FROM words
        LEFT OUTER JOIN
          (SELECT * FROM user_progress
           WHERE
           user_id = ${myAuth?.user?.id}
         ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.id = ${wordId}
        `;

    const data: Word[] = result.rows.map(fromDbWordProgress);
    return data?.[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch a single word.');
  }
}

export async function fetchCourses(): Promise<Course[]> {
  try {
    const myAuth = await auth();
    console.log('Fetching all courses for user: ', myAuth?.user?.name);

    // TODO: filter based on user permissions

    const result =
      await sql<DbCourse>`SELECT id, name, known_lang, learning_lang, course_code, total
      FROM
        courses
        LEFT OUTER JOIN
        (SELECT course_id, count(*) as total FROM words GROUP BY course_id) as total ON total.course_id = courses.id
      ORDER BY
        courses.name
      `;

    const courses: Course[] = result.rows.map(omDbCourse);

    const toLearnStats = await sql<{
      total: number;
      course_id: string;
    }>`SELECT count(words.id) as total, words.course_id as course_id
        FROM
          words
          LEFT OUTER JOIN
            (SELECT *
             FROM user_progress
             WHERE user_id = ${myAuth?.user?.id}
            ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.course_id IN (SELECT id FROM courses)
          AND (user_progress.memlevel = 0 OR user_progress.memlevel is NULL)
        GROUP BY
          words.course_id
    `;

    const toTestStats = await sql<{
      total: number;
      course_id: string;
    }>`SELECT count(words.id) as total, words.course_id as course_id
        FROM
          words
          LEFT OUTER JOIN
            (SELECT *
             FROM user_progress
             WHERE user_id = ${myAuth?.user?.id}
            ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.course_id IN (SELECT id FROM courses)
          AND (user_progress.memlevel > 0)
          AND user_progress.repeat_again < NOW()
        GROUP BY
          words.course_id
    `;

    courses.forEach((course) => {
      course.toLearn =
        toLearnStats.rows.find((s) => s.course_id === course.id)?.total ?? 0;
      course.toTest = toTestStats.rows.find((s) => s.course_id === course.id)?.total ?? 0;
    });

    return courses;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all courses.');
  }
}

export async function fetchCourse(courseId: string): Promise<Course | undefined> {
  try {
    const myAuth = await auth();
    console.log(`Fetching a single course "${courseId}" for user: `, myAuth?.user?.name);

    // TODO: statistics per user
    // TODO: filter based on user permissions

    const result =
      await sql<DbCourse>`SELECT id, name, known_lang, learning_lang, course_code
        FROM courses
        WHERE id = ${courseId}
        `;

    const data: Course[] = result.rows.map(omDbCourse);
    return data[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all courses.');
  }
}

export async function fetchPronunciation({
  id,
  courseId,
}: Pick<Word, 'id' | 'courseId'>): Promise<WordPronunciation | undefined> {
  try {
    const result = await sql<DbWord>`
      SELECT words.id, words.word, words.course_id, words.definition, sounds.audio_source_base64
      FROM words
      LEFT OUTER JOIN sounds ON words.id = sounds.word_id
      WHERE
        words.id = ${id}
        AND words.course_id = ${courseId}
      `;

    if (result.rows.length < 1) {
      console.info(
        `fetchPronunciation, word not found, id: ${id}, courseId: ${courseId}`,
      );
      return undefined;
    }

    return omDbPronunciation(result.rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch pronunciation.');
  }
}

export async function fetchExamples({
  wordId,
}: {
  wordId: Word['id'];
}): Promise<WordExamples | undefined> {
  try {
    const result = await sql<DbWord>`
      SELECT words.id AS id, words.word, words.course_id, words.definition, examples.id AS examples_id, examples.example
      FROM words
      LEFT OUTER JOIN examples ON words.id = examples.word_id
      WHERE words.id = ${wordId}
      ORDER BY examples.created_at ASC
      `;

    if (result.rows.length < 1) {
      console.info(`fetchExamples, word not found, id: ${wordId}`);
      return undefined;
    }

    return omDbExamples(result.rows);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch examples.');
  }
}
