'use server';

import { sql } from '@vercel/postgres';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

import { Word, WordToAdd } from '../definitions';
import { UpdateWordResult, UpdateWordsResult } from '../types';

export async function updateWordProgress(word: Word): Promise<UpdateWordResult> {
  const myAuth = await auth();
  try {
    const result = await sql`
        UPDATE user_progress
        SET memlevel = ${word.memLevel}, form = ${word.form}, repeat_again = ${word.repeatAgain?.toISOString() || 'NULL'}, is_priority = ${word.isPriority}, is_skipped = ${!!word.isSkipped}
        WHERE
          user_id = ${myAuth?.user?.id}
          AND word_id = ${word.id}
      `;

    if (result.rowCount === 0 || result.rowCount === null) {
      console.log('Insert new word progress (update failed): ', word.id);
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

      return { id: word.id };
    }

    if (result.rowCount > 1) {
      throw new Error(`Update rowCount is higher than 1 (${result.rowCount})`);
    }
  } catch (error) {
    console.error(error);
    return {
      message: `Database Error: Failed to update "${word.word}" (${word.id}) word progress. ${error}`,
      id: word.id,
    };
  }
}

export const updateWordsProgress = async (words: Word[]): Promise<UpdateWordsResult> => {
  const result = await Promise.all(words.map(updateWordProgress));
  const failedWordIds = result
    .filter((r) => r?.message)
    .map((r) => r?.id)
    .filter((id): id is string => id !== undefined);

  return {
    message: `Failed to update ${failedWordIds.length} words.`,
    failedWordIds,
  };
};

export async function addWord(word: WordToAdd): Promise<UpdateWordResult> {
  try {
    const result = await sql.query(
      `
        INSERT INTO words (word, definition, course_id)
        VALUES ($1, $2, $3) RETURNING *
      `,
      [word.word.trim(), word.definition.trim(), word.courseId],
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
        [word.word.trim(), word.definition.trim(), word.courseId],
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
          word = ${changed.word.trim()},
          definition = ${changed.definition.trim()}
        WHERE id = ${changed.id}
      `;

    await updateWordProgress(changed);
  } catch (e) {
    return {
      message: `Database Error: Failed to update word. ${JSON.stringify(e)}`,
    };
  }
}
