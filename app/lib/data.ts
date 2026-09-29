import { stringSimilarity } from 'string-similarity-js';
import { sql } from '@/app/lib/db';
import { User } from 'next-auth';
import { unstable_rethrow } from 'next/navigation';
import { auth } from '@/auth';
import {
  AdminCourse,
  Course,
  DbCourse,
  DbWord,
  TeachingForm,
  UserListItem,
  Word,
  WordImage,
} from '@/app/lib/definitions';
import { WordImageSummary, WordMediaSummary } from '@/app/lib/types';
import { STRING_SIMILARITY_SUBSTRING_LENGTH, testWordsCountLimit } from '../constants';

type DbWordProgress = DbWord & {
  memlevel: number;
  form: TeachingForm;
  repeat_again: string;
  is_priority: boolean;
  is_skipped: boolean;
  updated_at?: string | Date | null;
};
type UserAuth = User & {
  password: string;
  is_admin: boolean;
  locale?: string | null;
  token_version?: number;
};

export async function getUserForAuth(email: string): Promise<UserAuth | undefined> {
  try {
    const normalized = email.trim().toLowerCase();
    const user = await sql<UserAuth>`
      SELECT * FROM users WHERE lower(email) = ${normalized}
    `;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export async function fetchUserTokenVersion(userId: string): Promise<number | null> {
  try {
    const result = await sql<{ token_version: number }>`
      SELECT token_version FROM users WHERE id = ${userId}
    `;
    const row = result.rows[0];
    if (!row) return null;
    return Number(row.token_version);
  } catch (error) {
    console.error('Failed to fetch token version:', error);
    throw new Error('Failed to fetch token version.');
  }
}

export async function fetchUserLocale(userId: string): Promise<string | null> {
  try {
    const result = await sql<{ locale: string | null }>`
      SELECT locale FROM users WHERE id = ${userId}
    `;
    return result.rows[0]?.locale ?? null;
  } catch (error) {
    console.error('Failed to fetch user locale:', error);
    return null;
  }
}

export async function canChangeSharedDicts(userId: string): Promise<boolean> {
  try {
    const result = await sql<{ allowed: boolean }>`
      SELECT (is_admin OR can_change_shared_dicts) AS allowed
      FROM users
      WHERE id = ${userId}
    `;
    return result.rows[0]?.allowed ?? false;
  } catch (error) {
    console.error('Failed to check shared dictionary permission:', error);
    return false;
  }
}

/** Message when the signed-in user may not write shared dictionary content. */
export async function sharedDictChangeDenied(): Promise<string | undefined> {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId && (await canChangeSharedDicts(userId))) return undefined;
  const { getI18n } = await import('@/app/lib/i18n/get-i18n');
  const { t } = await getI18n();
  return t('errors.cannotChangeSharedDicts');
}

async function currentUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id;
}

/** Use rule: public course, or the signed-in user owns it. */
export async function canUseCourse(courseId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const result = await sql<{ ok: boolean }>`
    SELECT (is_public OR owner_user_id = ${userId}) AS ok
    FROM courses
    WHERE id = ${courseId}
  `;
  return result.rows[0]?.ok === true;
}

/** Edit rule: owner, or a public course and the user may change shared courses. */
export async function canEditCourse(courseId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const shared = await canChangeSharedDicts(userId);
  const result = await sql<{ ok: boolean }>`
    SELECT (
      owner_user_id = ${userId}
      OR (is_public AND ${shared})
    ) AS ok
    FROM courses
    WHERE id = ${courseId}
  `;
  return result.rows[0]?.ok === true;
}

export async function canUseWord(wordId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const result = await sql<{ ok: boolean }>`
    SELECT (c.is_public OR c.owner_user_id = ${userId}) AS ok
    FROM words w
    JOIN courses c ON c.id = w.course_id
    WHERE w.id = ${wordId}
  `;
  return result.rows[0]?.ok === true;
}

async function courseIdForWord(wordId: string): Promise<string | undefined> {
  const result = await sql<{ course_id: string }>`
    SELECT course_id FROM words WHERE id = ${wordId}
  `;
  return result.rows[0]?.course_id;
}

async function courseIdForImage(imageId: string): Promise<string | undefined> {
  const result = await sql<{ course_id: string }>`
    SELECT w.course_id
    FROM word_images wi
    JOIN words w ON w.id = wi.word_id
    WHERE wi.id = ${imageId}
  `;
  return result.rows[0]?.course_id;
}

async function errorText(
  key: 'errors.notAuthenticated' | 'errors.cannotEditCourse',
): Promise<string>;
async function errorText(
  key: 'errors.courseNotFound' | 'errors.wordNotFound' | 'errors.imageNotFound',
  id: string,
): Promise<string>;
async function errorText(
  key:
    | 'errors.notAuthenticated'
    | 'errors.cannotEditCourse'
    | 'errors.courseNotFound'
    | 'errors.wordNotFound'
    | 'errors.imageNotFound',
  id?: string,
): Promise<string> {
  const { getI18n } = await import('@/app/lib/i18n/get-i18n');
  const { t } = await getI18n();
  if (key === 'errors.courseNotFound') return t(key, { id: id ?? '' });
  if (key === 'errors.wordNotFound') return t(key, { id: id ?? '' });
  if (key === 'errors.imageNotFound') return t(key, { id: id ?? '' });
  return t(key);
}

export async function courseEditDenied(courseId: string): Promise<string | undefined> {
  const userId = await currentUserId();
  if (!userId) return errorText('errors.notAuthenticated');
  if (await canEditCourse(courseId)) return undefined;
  if (await canUseCourse(courseId)) return errorText('errors.cannotEditCourse');
  return errorText('errors.courseNotFound', courseId);
}

export async function courseUseDenied(courseId: string): Promise<string | undefined> {
  const userId = await currentUserId();
  if (!userId) return errorText('errors.notAuthenticated');
  if (await canUseCourse(courseId)) return undefined;
  return errorText('errors.courseNotFound', courseId);
}

export async function courseEditDeniedForWord(
  wordId: string,
): Promise<string | undefined> {
  const courseId = await courseIdForWord(wordId);
  if (!courseId) return errorText('errors.wordNotFound', wordId);
  return courseEditDenied(courseId);
}

export async function courseUseDeniedForWord(
  wordId: string,
): Promise<string | undefined> {
  const courseId = await courseIdForWord(wordId);
  if (!courseId) return errorText('errors.wordNotFound', wordId);
  return courseUseDenied(courseId);
}

export async function courseEditDeniedForImage(
  imageId: string,
): Promise<string | undefined> {
  const courseId = await courseIdForImage(imageId);
  if (!courseId) return errorText('errors.imageNotFound', imageId);
  return courseEditDenied(courseId);
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const result = await sql<{ is_admin: boolean }>`
      SELECT is_admin FROM users WHERE id = ${userId}
    `;
    return result.rows[0]?.is_admin ?? false;
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
}

export async function fetchAllUsers(): Promise<UserListItem[]> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId || !(await isUserAdmin(userId))) {
      return [];
    }
    const result = await sql<UserListItem>`
      SELECT id, name, email, is_admin, can_change_shared_dicts, created_at,
        (
          SELECT count(*)::int
          FROM courses
          WHERE owner_user_id = users.id AND is_public = FALSE
        ) AS private_course_count
      FROM users
      ORDER BY name ASC
    `;
    return result.rows;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw new Error('Failed to fetch users.');
  }
}

const progressUpdatedAtFromDb = (
  value: string | Date | null | undefined,
): Date | undefined => {
  if (value == null || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

/** ISO string for Postgres `timestamp without time zone` (UTC wall clock from app writes). */
const isoFromPgTimestampWithoutTz = (value: string | Date): string | undefined => {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds(),
      ),
    ).toISOString();
  }
  if (value === '') return undefined;
  const trimmed = String(value).trim();
  const normalized = trimmed.includes('T')
    ? trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)
      ? trimmed
      : `${trimmed}Z`
    : `${trimmed.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const fromDbWordProgress = (dbWord: DbWordProgress): Word => {
  const progressUpdatedAt = progressUpdatedAtFromDb(dbWord.updated_at);
  return {
    courseId: dbWord.course_id,
    id: dbWord.id,
    word: dbWord.word,
    definition: dbWord.definition,
    form: dbWord.form ?? 'show',
    memLevel: Number(dbWord.memlevel ?? '0'),
    repeatAgain: new Date(dbWord.repeat_again || Date.now()),
    isPriority: dbWord.is_priority ?? false,
    isSkipped: dbWord.is_skipped ?? false,
    ...(progressUpdatedAt ? { progressUpdatedAt } : {}),
  };
};

const omDbCourse = (dbCourse: DbCourse): Course => ({
  id: dbCourse.id,
  name: dbCourse.name,
  knownLang: dbCourse.known_lang,
  learningLang: dbCourse.learning_lang,
  courseCode: dbCourse.course_code,
  total: dbCourse.total ?? 0,
  toLearn: -1,
  toTest: -1,
  withPriority: -1,
  coursePriority: dbCourse.course_priority ?? 0,
  isPublic: dbCourse.is_public !== false,
  ownedByMe: dbCourse.owned_by_me === true,
});

export type WordPronunciation = Pick<Word, 'id' | 'word' | 'definition'> & {
  audioContent?: Buffer;
};

export type WordExamples = Pick<Word, 'id' | 'word' | 'definition' | 'courseId'> & {
  examples: string[];
};

const omDbPronunciation = (
  dbWord: Pick<DbWord, 'id' | 'course_id' | 'word' | 'definition'> & {
    content?: Buffer;
  },
): WordPronunciation => ({
  id: dbWord.id,
  word: dbWord.word,
  definition: dbWord.definition,
  audioContent: dbWord.content,
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
    if (!(await canUseCourse(courseId))) return [];

    const result = await sql<DbWordProgress>`
        SELECT words.course_id, words.id, words.word, words.course_id, words.definition,
               user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority, user_progress.is_skipped
        FROM words
        LEFT OUTER JOIN
          (SELECT * FROM user_progress
           WHERE
             user_id = ${myAuth?.user?.id}
          ) AS user_progress ON words.id = user_progress.word_id
        WHERE
          words.course_id = ${courseId}
          AND (user_progress.memlevel = 0 OR user_progress.memlevel is NULL)
          AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
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
  deepMemoryCountLimit: number,
): Promise<Word[]> {
  try {
    const myAuth = await auth();
    if (!(await canUseCourse(courseId))) return [];

    const result = priorityFirst
      ? await sql<DbWordProgress>`
          SELECT words.course_id, words.id, words.word, words.course_id, words.definition,
                 user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority, user_progress.is_skipped, user_progress.updated_at
          FROM words
          LEFT OUTER JOIN
            (SELECT * FROM user_progress
             WHERE user_id = ${myAuth?.user?.id}
            ) AS user_progress ON words.id = user_progress.word_id
          WHERE
            words.course_id = ${courseId}
            AND (user_progress.memlevel > 0)
            AND (
              user_progress.repeat_again < NOW()
              OR user_progress.is_priority = TRUE
            )
            AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
          ORDER BY user_progress.is_priority DESC, user_progress.memlevel
        `
      : await sql<DbWordProgress>`
          SELECT words.course_id, words.id, words.word, words.course_id, words.definition,
                 user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority, user_progress.is_skipped, user_progress.updated_at
          FROM words
          LEFT OUTER JOIN
            (SELECT * FROM user_progress
             WHERE user_id = ${myAuth?.user?.id}
            ) AS user_progress ON words.id = user_progress.word_id
          WHERE
            words.course_id = ${courseId}
            AND (user_progress.memlevel > 0)
            AND (user_progress.repeat_again < NOW())
            AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
          ORDER BY user_progress.memlevel
        `;
    const allWords: Word[] = result.rows.map(fromDbWordProgress);
    if (!priorityFirst && allWords.length === 0) {
      const ahead = await sql<DbWordProgress>`
          SELECT words.course_id, words.id, words.word, words.course_id, words.definition,
                 user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority, user_progress.is_skipped, user_progress.updated_at
          FROM words
          LEFT OUTER JOIN
            (SELECT * FROM user_progress
             WHERE user_id = ${myAuth?.user?.id}
            ) AS user_progress ON words.id = user_progress.word_id
          WHERE
            words.course_id = ${courseId}
            AND (user_progress.memlevel > 0)
            AND (user_progress.repeat_again >= NOW())
            AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
          ORDER BY user_progress.repeat_again ASC
          LIMIT ${limit}
        `;
      return ahead.rows.map(fromDbWordProgress);
    }

    const urgentWords = allWords.slice(0, limit);

    let deepMemoryWords: Word[] = [];
    if (urgentWords.length > 0) {
      const minMemLevel = urgentWords[urgentWords.length - 1].memLevel;
      const allDeepMemoryWords = allWords.filter((w) => w.memLevel > minMemLevel);
      deepMemoryWords = allDeepMemoryWords
        .sort(() => Math.random() - 0.5)
        .slice(0, deepMemoryCountLimit);
    }

    return [...urgentWords, ...deepMemoryWords];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch words to test.');
  }
}

export async function countWordsToLearn(courseId: string): Promise<number> {
  try {
    if (!(await canUseCourse(courseId))) return 0;
    const myAuth = await auth();
    const result = await sql<{ count: string }>`
      SELECT count(words.id) as count
      FROM words
      LEFT OUTER JOIN
        (SELECT * FROM user_progress WHERE user_id = ${myAuth?.user?.id}) AS user_progress
        ON words.id = user_progress.word_id
      WHERE
        words.course_id = ${courseId}
        AND (user_progress.memlevel = 0 OR user_progress.memlevel IS NULL)
        AND (user_progress.is_skipped = FALSE OR user_progress.memlevel IS NULL)
    `;
    return parseInt(result.rows[0]?.count ?? '0', 10);
  } catch (error) {
    console.error('Database Error:', error);
    return 0;
  }
}

export async function countWordsToTest(courseId: string): Promise<number> {
  try {
    if (!(await canUseCourse(courseId))) return 0;
    const myAuth = await auth();
    const result = await sql<{ count: string }>`
      SELECT count(words.id) as count
      FROM words
      LEFT OUTER JOIN
        (SELECT * FROM user_progress WHERE user_id = ${myAuth?.user?.id}) AS user_progress
        ON words.id = user_progress.word_id
      WHERE
        words.course_id = ${courseId}
        AND (user_progress.memlevel > 0)
        AND (user_progress.is_skipped = FALSE OR user_progress.memlevel IS NULL)
        AND user_progress.repeat_again < NOW()
    `;
    return parseInt(result.rows[0]?.count ?? '0', 10);
  } catch (error) {
    console.error('Database Error:', error);
    return 0;
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
    if (!(await canUseCourse(courseId))) return [];

    const result = await sql<DbWordProgress>`
        SELECT
          words.course_id, words.id, words.word, words.definition,
          user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority, user_progress.is_skipped
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

export async function fetchWord(wordId: string): Promise<Word | undefined> {
  try {
    const myAuth = await auth();
    console.log('Fetching a single word for the user ', myAuth?.user?.name, ': ', wordId);
    if (!(await canUseWord(wordId))) return undefined;

    const result = await sql<DbWordProgress>`
        SELECT
          words.course_id, words.id, words.word, words.definition,
          user_progress.form, user_progress.memlevel, user_progress.repeat_again, user_progress.is_priority, user_progress.is_skipped
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
    const userId = myAuth?.user?.id;
    if (!userId) return [];

    const fetchResults = await Promise.all([
      // generic
      sql<DbCourse>`SELECT courses.id, courses.name, courses.known_lang, courses.learning_lang, courses.course_code, courses.is_public, (courses.owner_user_id = ${userId}) AS owned_by_me, total.total, user_course.priority AS course_priority
      FROM
        courses
        LEFT OUTER JOIN
        (SELECT course_id, count(*) as total FROM words GROUP BY course_id) as total ON total.course_id = courses.id
        LEFT OUTER JOIN
        user_course ON user_course.course_id = courses.id AND user_course.user_id = ${userId}
      WHERE
        courses.is_public OR courses.owner_user_id = ${userId}
      ORDER BY
        COALESCE(user_course.priority, 0) ASC, courses.name ASC
      `,

      // to learn
      sql<{
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
            (user_progress.memlevel = 0 OR user_progress.memlevel is NULL)
            AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
          GROUP BY
            words.course_id
      `,

      // to test
      sql<{
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
            (user_progress.memlevel > 0)
            AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
            AND user_progress.repeat_again < NOW()
          GROUP BY
            words.course_id
      `,

      // with priority
      sql<{
        total: number;
        course_id: string;
      }>`SELECT count(*) as total, words.course_id as course_id
        FROM
          words JOIN
          (SELECT * FROM user_progress
           WHERE
             user_id = ${myAuth?.user?.id}
             AND is_priority = TRUE
          ) AS user_progress
          ON words.id = user_progress.word_id
        GROUP BY
          words.course_id
    `,

      // latest repeat_again in the next testWordsCountLimit not-yet-due words
      sql<{
        course_id: string;
        until: string | Date;
      }>`SELECT course_id, MAX(repeat_again) AS until
          FROM (
            SELECT
              words.course_id,
              user_progress.repeat_again,
              ROW_NUMBER() OVER (
                PARTITION BY words.course_id
                ORDER BY user_progress.repeat_again ASC
              ) AS rn
            FROM words
            LEFT OUTER JOIN
              (SELECT *
               FROM user_progress
               WHERE user_id = ${myAuth?.user?.id}
              ) AS user_progress ON words.id = user_progress.word_id
            WHERE
              (user_progress.memlevel > 0)
              AND (user_progress.is_skipped = FALSE OR user_progress.memlevel is NULL)
              AND user_progress.repeat_again >= NOW()
          ) AS ranked
          WHERE rn <= ${testWordsCountLimit}
          GROUP BY course_id
    `,
    ]);

    const [result, toLearnStats, toTestStats, withPriorityStats, advancedBatchStats] =
      fetchResults;
    const courses: Course[] = result.rows.map(omDbCourse);

    courses.forEach((course) => {
      course.toLearn =
        toLearnStats.rows.find((s) => s.course_id === course.id)?.total ?? 0;
      course.toTest = toTestStats.rows.find((s) => s.course_id === course.id)?.total ?? 0;
      course.withPriority =
        withPriorityStats.rows.find((s) => s.course_id === course.id)?.total ?? 0;
      if (Number(course.toTest) === 0) {
        const until = advancedBatchStats.rows.find(
          (s) => s.course_id === course.id,
        )?.until;
        if (until) {
          const iso = isoFromPgTimestampWithoutTz(until);
          if (iso) {
            course.advancedBatchUntil = iso;
          }
        }
      }
    });

    return courses;
  } catch (error) {
    unstable_rethrow(error);
    console.error('Database Error:', error);
    throw new Error('Failed to fetch all courses.');
  }
}

export async function fetchEditableCourses(): Promise<Course[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const shared = await canChangeSharedDicts(userId);
  const courses = await fetchCourses();
  return courses.filter((course) => course.ownedByMe || (course.isPublic && shared));
}

export async function fetchAllCoursesForAdmin(): Promise<AdminCourse[]> {
  try {
    const userId = await currentUserId();
    if (!userId || !(await isUserAdmin(userId))) return [];
    const result = await sql<{
      id: string;
      name: string;
      known_lang: string;
      learning_lang: string;
      course_code: string;
      is_public: boolean;
      owner_user_id: string | null;
      owner_name: string | null;
    }>`
      SELECT courses.id, courses.name, courses.known_lang, courses.learning_lang, courses.course_code,
        courses.is_public, courses.owner_user_id, users.name AS owner_name
      FROM courses
      LEFT JOIN users ON users.id = courses.owner_user_id
      ORDER BY courses.name ASC
    `;
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      knownLang: row.known_lang,
      learningLang: row.learning_lang,
      courseCode: row.course_code,
      isPublic: row.is_public === true,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch courses for admin.');
  }
}

export async function fetchCourse(courseId: string): Promise<Course | undefined> {
  try {
    const myAuth = await auth();
    console.log(`Fetching a single course "${courseId}" for user: `, myAuth?.user?.name);
    const userId = myAuth?.user?.id;
    if (!userId) return undefined;

    const result =
      await sql<DbCourse>`SELECT id, name, known_lang, learning_lang, course_code, is_public,
          (owner_user_id = ${userId}) AS owned_by_me
        FROM courses
        WHERE id = ${courseId}
          AND (is_public OR owner_user_id = ${userId})
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
    if (!(await canUseCourse(courseId))) return undefined;
    const result = await sql<DbWord>`
      SELECT words.id, words.word, words.course_id, words.definition, sounds.content
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
    if (!(await canUseWord(wordId))) return undefined;
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

export async function fetchCoursePriority(courseId: string): Promise<number | undefined> {
  try {
    const myAuth = await auth();
    const result = await sql<{ priority: number }>`
      SELECT priority FROM user_course
      WHERE user_id = ${myAuth?.user?.id} AND course_id = ${courseId}
    `;
    return result.rows[0]?.priority;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch course priority.');
  }
}

type DbWordImage = {
  id: string;
  word_id: string;
  content: Buffer;
  created_at: string;
};

/** Oldest image id for each word that has one. Empty input returns {}. */
export async function fetchOldestImageIds(
  wordIds: string[],
): Promise<Record<string, string>> {
  if (wordIds.length === 0) return {};
  try {
    const userId = await currentUserId();
    if (!userId) return {};
    const result = await sql<{ id: string; word_id: string }>`
      SELECT DISTINCT ON (word_id) word_images.id, word_images.word_id
      FROM word_images
      JOIN words ON words.id = word_images.word_id
      JOIN courses ON courses.id = words.course_id
      WHERE word_images.word_id = ANY(${wordIds}::uuid[])
        AND (courses.is_public OR courses.owner_user_id = ${userId})
      ORDER BY word_id, word_images.created_at ASC
    `;
    const imageIdByWordId: Record<string, string> = {};
    for (const row of result.rows) {
      imageIdByWordId[row.word_id] = row.id;
    }
    return imageIdByWordId;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch word image ids.');
  }
}

export async function fetchWordImages(wordId: string): Promise<WordImage[]> {
  try {
    if (!(await canUseWord(wordId))) return [];
    const result = await sql<DbWordImage>`
      SELECT id, word_id, content, created_at
      FROM word_images
      WHERE word_id = ${wordId}
      ORDER BY created_at ASC
    `;
    return result.rows.map((row) => ({
      id: row.id,
      wordId: row.word_id,
      content: row.content,
      createdAt: new Date(row.created_at),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch word images.');
  }
}

export async function fetchWordImageById(
  imageId: string,
): Promise<WordImage | undefined> {
  try {
    const userId = await currentUserId();
    if (!userId) return undefined;
    const result = await sql<DbWordImage>`
      SELECT word_images.id, word_images.word_id, word_images.content, word_images.created_at
      FROM word_images
      JOIN words ON words.id = word_images.word_id
      JOIN courses ON courses.id = words.course_id
      WHERE word_images.id = ${imageId}
        AND (courses.is_public OR courses.owner_user_id = ${userId})
    `;
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      wordId: row.word_id,
      content: row.content,
      createdAt: new Date(row.created_at),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch word image.');
  }
}

type DbWordImageSummary = {
  word_id: string;
  word: string;
  definition: string;
  image_count: string;
  total_size_bytes: string;
  requested: boolean;
  in_progress: boolean;
};

export async function fetchWordImageSummaries(
  courseId: string,
): Promise<WordImageSummary[]> {
  try {
    if (!(await canUseCourse(courseId))) return [];
    const result = await sql<DbWordImageSummary>`
      SELECT
        w.id AS word_id,
        w.word,
        w.definition,
        COALESCE(img.cnt, 0) AS image_count,
        COALESCE(img.total_size, 0) AS total_size_bytes,
        (ir.word_id IS NOT NULL) AS requested,
        (ir.in_progress_since IS NOT NULL) AS in_progress
      FROM words w
      LEFT JOIN (
        SELECT word_id, COUNT(*) AS cnt, SUM(LENGTH(content)) AS total_size FROM word_images GROUP BY word_id
      ) img ON img.word_id = w.id
      LEFT JOIN image_requests ir ON ir.word_id = w.id
      WHERE w.course_id = ${courseId}
      ORDER BY w.word ASC
    `;
    return result.rows.map((row) => ({
      wordId: row.word_id,
      word: row.word,
      definition: row.definition,
      imageCount: parseInt(String(row.image_count), 10),
      totalSizeKb: Math.round(parseInt(String(row.total_size_bytes), 10) / 1024),
      requested: !!row.requested,
      inProgress: !!row.in_progress,
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch word image summaries.');
  }
}

type DbWordMediaSummary = {
  word_id: string;
  course_id: string;
  word: string;
  definition: string;
  image_count: string;
  total_image_size_bytes: string;
  requested: boolean;
  in_progress: boolean;
  has_sound: boolean;
  sound_size_bytes: string;
};

export async function fetchWordMediaSummaries(
  courseId: string,
): Promise<WordMediaSummary[]> {
  try {
    if (!(await canUseCourse(courseId))) return [];
    const result = await sql<DbWordMediaSummary>`
      SELECT
        w.id AS word_id,
        w.course_id,
        w.word,
        w.definition,
        COALESCE(img.cnt, 0) AS image_count,
        COALESCE(img.total_size, 0) AS total_image_size_bytes,
        (ir.word_id IS NOT NULL) AS requested,
        (ir.in_progress_since IS NOT NULL) AS in_progress,
        (snd.word_id IS NOT NULL) AS has_sound,
        COALESCE(LENGTH(snd.content), 0) AS sound_size_bytes
      FROM words w
      LEFT JOIN (
        SELECT word_id, COUNT(*) AS cnt, SUM(LENGTH(content)) AS total_size
        FROM word_images GROUP BY word_id
      ) img ON img.word_id = w.id
      LEFT JOIN image_requests ir ON ir.word_id = w.id
      LEFT JOIN sounds snd ON snd.word_id = w.id
      WHERE w.course_id = ${courseId}
      ORDER BY w.word ASC
    `;
    return result.rows.map((row) => ({
      wordId: row.word_id,
      courseId: row.course_id,
      word: row.word,
      definition: row.definition,
      imageCount: parseInt(String(row.image_count), 10),
      totalImageSizeKb: Math.round(
        parseInt(String(row.total_image_size_bytes), 10) / 1024,
      ),
      imageRequested: !!row.requested,
      imageInProgress: !!row.in_progress,
      hasSound: !!row.has_sound,
      soundSizeKb: Math.round(parseInt(String(row.sound_size_bytes), 10) / 1024),
    }));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch word media summaries.');
  }
}
