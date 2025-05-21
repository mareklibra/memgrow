'use server';

import { sql } from '@vercel/postgres';

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
      SET memlevel = ${word.memLevel}, form = ${word.form}
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
        INSERT INTO user_progress (word_id, user_id, memlevel, form)
        VALUES ($1, $2, $3, $4) RETURNING *
      `,
        [word.id, myAuth?.user?.id, word.memLevel, word.form],
      );
    }
  } catch (error) {
    console.error(error);
    return { message: `Database Error: Failed to update word progress. ${error}` };
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

export async function authenticate(prevState: string | undefined, formData: FormData) {
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
