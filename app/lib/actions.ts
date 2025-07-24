'use server';

import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';

import { signIn, auth } from '@/auth';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { Word, WordToAdd } from './definitions';

export type UpdateWordResult =
  | undefined
  | {
      message?: string;
      id?: Word['id'];
    };

export async function updateWordProgress(word: Word): Promise<UpdateWordResult> {
  const myAuth = await auth();

  try {
    const result = await sql`
      UPDATE user_progress
      SET memlevel = ${word.memLevel}, form = ${word.form}, repeat_again = ${word.repeatAgain?.toISOString() || 'NULL'}, is_priority = ${word.isPriority}
      WHERE
        user_id = ${myAuth?.user?.id}
        AND word_id = ${word.id}
    `;

    if (result.rowCount > 1) {
      throw new Error(`Update rowCount is higher than 1 (${result.rowCount})`);
    }

    if (result.rowCount === 0) {
      await sql.query(
        `
        INSERT INTO user_progress (word_id, user_id, memlevel, form, repeat_again, is_priority)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `,
        [
          word.id,
          myAuth?.user?.id,
          word.memLevel,
          word.form,
          word.repeatAgain,
          word.isPriority,
        ],
      );
    }
  } catch (error) {
    console.error(error);
    return {
      message: `Database Error: Failed to update "${word.word}" (${word.id}) word progress. ${error}`,
    };
  }
}

export async function addWord(word: WordToAdd): Promise<UpdateWordResult> {
  try {
    const result = await sql.query(
      `
      INSERT INTO words (word, definition, course_id)
      VALUES ($1, $2, $3) RETURNING *
    `,
      [word.word, word.definition, word.courseId],
    );
    revalidatePath('/edit');
    return { id: result.rows[0].id };
  } catch (e) {
    return {
      message: `Database Error: Failed to insert new word. ${JSON.stringify(e)}`,
    };
  }
}

export async function addWordBatch(words: WordToAdd[]): Promise<UpdateWordResult[]> {
  try {
    const promises = words.map((word) =>
      sql.query(
        `
      INSERT INTO words (word, definition, course_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
        [word.word, word.definition, word.courseId],
      ),
    );
    const results = await Promise.allSettled(promises);

    revalidatePath('/edit');
    return results.map((r, idx) => {
      if (r.status === 'fulfilled') {
        return { id: r.value.rows[0].id };
      }
      return {
        message: `Database Error: Failed to insert new word "${JSON.stringify(words[idx])}". ${JSON.stringify(r.reason)}`,
      };
    });
  } catch (e) {
    return [{ message: `Generic DB error: ${JSON.stringify(e)}` }];
  }
}

export async function deleteWord(word: Word): Promise<UpdateWordResult> {
  try {
    await sql`
      DELETE FROM words WHERE id=${word.id}
    `;

    revalidatePath('/edit');
  } catch (e) {
    return {
      message: `Database Error: Failed to delete the word. ${JSON.stringify(e)}`,
    };
  }
}

export async function updateWord(changed: Word): Promise<UpdateWordResult> {
  try {
    await sql`
      UPDATE words
      SET 
        word = ${changed.word},
        definition = ${changed.definition}
      WHERE id = ${changed.id}
    `;

    await updateWordProgress(changed);
  } catch (e) {
    return {
      message: `Database Error: Failed to update word. ${JSON.stringify(e)}`,
    };
  }
}

export async function insertPronunciation(wordId: string, audioSourceB64: string) {
  const result = await sql.query(
    `
    INSERT INTO sounds (word_id, audio_source_base64)
    VALUES ($1, $2)
    RETURNING *
  `,
    [wordId, audioSourceB64],
  );

  return { id: result.rows[0].id };
}

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    await sql`
      UPDATE users
      SET password = ${hashedPassword}
      WHERE id = ${userId}
    `;
  } catch (e) {
    return {
      message: `Database Error: Failed to change user password. ${JSON.stringify(e)}`,
    };
  }
}

export async function addNewUser(user: {
  name: string;
  email: string;
  password: string;
}) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  try {
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${user.name}, ${user.email}, ${hashedPassword})
    `;
  } catch (e) {
    return {
      message: `Database Error: Failed to add new user. ${JSON.stringify(e)}`,
    };
  }
}

export async function updateCourse(courseId: string, course: { courseCode: string }) {
  try {
    await sql`
      UPDATE courses
      SET course_code = ${course.courseCode}
      WHERE id = ${courseId}
    `;
  } catch (e) {
    return {
      message: `Database Error: Failed to update course. ${JSON.stringify(e)}`,
    };
  }
}

export async function createCourse(course: {
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
}) {
  try {
    await sql`
      INSERT INTO courses (name, known_lang, learning_lang, course_code)
      VALUES (${course.name}, ${course.knownLang}, ${course.learningLang}, ${course.courseCode})
    `;
    revalidatePath('/edit');
  } catch (e) {
    return {
      message: `Database Error: Failed to create course. ${JSON.stringify(e)}`,
    };
  }
}
