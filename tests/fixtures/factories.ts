import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { mockAuthUser } from '../setup/auth-mock';

export async function createTestUser(overrides?: {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
}) {
  const password = overrides?.password ?? 'password123';
  const hashedPassword = await bcrypt.hash(password, 2); // low rounds for speed
  const result = await sql`
    INSERT INTO users (id, name, email, password)
    VALUES (
      ${overrides?.id ?? mockAuthUser.id},
      ${overrides?.name ?? mockAuthUser.name},
      ${overrides?.email ?? mockAuthUser.email},
      ${hashedPassword}
    )
    RETURNING id, name, email
  `;
  return result.rows[0] as { id: string; name: string; email: string };
}

export async function createTestCourse(overrides?: {
  id?: string;
  name?: string;
  knownLang?: string;
  learningLang?: string;
  courseCode?: string;
}) {
  const result = await sql`
    INSERT INTO courses (name, known_lang, learning_lang, course_code)
    VALUES (
      ${overrides?.name ?? 'Test Course'},
      ${overrides?.knownLang ?? 'English'},
      ${overrides?.learningLang ?? 'Spanish'},
      ${overrides?.courseCode ?? 'es'}
    )
    RETURNING id, name, known_lang, learning_lang, course_code
  `;
  return result.rows[0] as {
    id: string;
    name: string;
    known_lang: string;
    learning_lang: string;
    course_code: string;
  };
}

export async function createTestWord(
  courseId: string,
  overrides?: { word?: string; definition?: string },
) {
  const result = await sql`
    INSERT INTO words (course_id, word, definition)
    VALUES (
      ${courseId},
      ${overrides?.word ?? 'test word'},
      ${overrides?.definition ?? 'test definition'}
    )
    RETURNING id, course_id, word, definition
  `;
  return result.rows[0] as {
    id: string;
    course_id: string;
    word: string;
    definition: string;
  };
}

export async function createTestUserProgress(
  userId: string,
  wordId: string,
  overrides?: {
    memlevel?: number;
    form?: string;
    repeatAgain?: Date;
    isPriority?: boolean;
    isSkipped?: boolean;
  },
) {
  await sql`
    INSERT INTO user_progress (user_id, word_id, memlevel, form, repeat_again, is_priority, is_skipped)
    VALUES (
      ${userId},
      ${wordId},
      ${overrides?.memlevel ?? 1},
      ${overrides?.form ?? 'show'},
      ${(overrides?.repeatAgain ?? new Date(Date.now() - 86400000)).toISOString()},
      ${overrides?.isPriority ?? false},
      ${overrides?.isSkipped ?? false}
    )
  `;
}
