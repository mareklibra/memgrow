import { stringSimilarity } from 'string-similarity-js';
import { sql } from '@vercel/postgres';
import { User } from 'next-auth';
import { auth } from '@/auth';
import { Course, DbCourse, DbWord, TeachingForm, Word } from '@/app/lib/definitions';

type DbWordProgress = DbWord & { memlevel: number; form: TeachingForm, repeat_again: string };
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
});

const omDbCourse = (dbCourse: DbCourse): Course => ({
  id: dbCourse.id,
  name: dbCourse.name,
  knownLang: dbCourse.known_lang,
  learningLang: dbCourse.learning_lang,
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
        similarity:
          // TODO: Tweak following
          stringSimilarity(word.word, candidate.word, 2 /* 1 */),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    console.log(`-- candidates for ${word.word}: `, candidates);
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

    const result =
      await sql<DbWordProgress>`SELECT words.id, words.word, words.course_id, words.definition, user_progress.form, user_progress.memlevel, user_progress.repeat_again
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

export async function fetchWordsToTest(courseId: string, limit: number): Promise<Word[]> {
  try {
    const myAuth = await auth();
    console.log('Fetching words to test by user: ', myAuth?.user?.name);

    const result =
      await sql<DbWordProgress>`SELECT words.id, words.word, words.course_id, words.definition, user_progress.form, user_progress.memlevel, user_progress.repeat_again
        FROM words
        LEFT OUTER JOIN
          (SELECT * FROM user_progress
           WHERE
           user_id = ${myAuth?.user?.id}
         ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.course_id = ${courseId}
          AND (user_progress.memlevel > 0)
          AND user_progress.repeat_again < NOW()
        ORDER BY user_progress.repeat_again
        LIMIT ${limit}
        `;

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

    const result =
      await sql<DbWordProgress>`SELECT words.id, words.word, words.definition, user_progress.form, user_progress.memlevel, user_progress.repeat_again
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

export async function fetchCourses(): Promise<Course[]> {
  try {
    const myAuth = await auth();
    console.log('Fetching all courses for user: ', myAuth?.user?.name);

    // TODO: statistics per user
    // TODO: filter based on user permissions

    const result = await sql<DbCourse>`SELECT id, name, known_lang, learning_lang
        FROM courses
        `;

    const data: Course[] = result.rows.map(omDbCourse);
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all courses.');
  }
}
