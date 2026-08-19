'use server';

import { sql } from '@/app/lib/db';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

import { Word, WordToAdd } from '../definitions';
import { countWordsToLearn, countWordsToTest } from '../data';
import { UpdateWordResult, UpdateWordsResult } from '../types';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { getI18n } from '@/app/lib/i18n/get-i18n';

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
    return {
      message: await genericErrorMessage(
        error,
        `Failed to update word progress ${word.id}`,
      ),
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

  const { t } = await getI18n();
  return {
    message: t('errors.updateWordsFailed', { count: failedWordIds.length }),
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
      message: await genericErrorMessage(e, 'Failed to insert new word'),
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
    const { t } = await getI18n();
    return results.map((r) => {
      if (r.status === 'fulfilled') {
        return { id: r.value.rows[0].id };
      }
      console.error('Failed to insert word in batch', r.reason);
      return { message: t('errors.generic') };
    });
  } catch (e) {
    return [{ message: await genericErrorMessage(e, 'Failed to insert word batch') }];
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
      message: await genericErrorMessage(e, 'Failed to delete word'),
    };
  }
}

export async function autoLearnWords(courseId: string): Promise<UpdateWordsResult> {
  const { t } = await getI18n();
  const myAuth = await auth();
  if (!myAuth?.user?.id) {
    return { message: t('errors.notAuthenticatedShort'), failedWordIds: [] };
  }

  try {
    const result = await sql<{
      id: string;
      word: string;
      definition: string;
      course_id: string;
    }>`
      SELECT words.id, words.word, words.definition, words.course_id
      FROM words
      LEFT OUTER JOIN
        (SELECT * FROM user_progress WHERE user_id = ${myAuth.user.id}) AS user_progress
        ON words.id = user_progress.word_id
      WHERE
        words.course_id = ${courseId}
        AND (user_progress.memlevel = 0 OR user_progress.memlevel IS NULL)
        AND (user_progress.is_skipped = FALSE OR user_progress.memlevel IS NULL)
    `;

    const wordsToLearn = result.rows;
    if (wordsToLearn.length === 0) {
      return { message: t('errors.noWordsToAutoLearn'), failedWordIds: [] };
    }

    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    const slotSize = oneMonthMs / wordsToLearn.length;

    const shuffled = wordsToLearn.sort(() => Math.random() - 0.5);

    const updates = shuffled.map((dbWord, i) => {
      const memLevel = Math.floor(Math.random() * 15) + 1;
      const slotStart = now + i * slotSize;
      const repeatAgain = new Date(slotStart + Math.random() * slotSize);

      const word: Word = {
        id: dbWord.id,
        courseId: dbWord.course_id,
        word: dbWord.word,
        definition: dbWord.definition,
        memLevel,
        form: 'show',
        repeatAgain,
        isPriority: false,
        isSkipped: false,
      };
      return updateWordProgress(word);
    });

    const results = await Promise.all(updates);
    const failedWordIds = results
      .filter((r) => r?.message)
      .map((r) => r?.id)
      .filter((id): id is string => id !== undefined);

    revalidatePath('/edit');

    if (failedWordIds.length > 0) {
      return {
        message: t('errors.autoLearnPartial', {
          ok: shuffled.length - failedWordIds.length,
          failed: failedWordIds.length,
        }),
        failedWordIds,
      };
    }

    return {
      message: t('errors.autoLearnSuccess', { count: shuffled.length }),
      failedWordIds: [],
    };
  } catch (error) {
    console.error('autoLearnWords error:', error);
    return { message: t('errors.autoLearnFailed'), failedWordIds: [] };
  }
}

export async function fetchRemainingWordsCount(
  courseId: string,
  isLearning: boolean,
): Promise<number> {
  return isLearning ? countWordsToLearn(courseId) : countWordsToTest(courseId);
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
      message: await genericErrorMessage(e, 'Failed to update word'),
    };
  }
}
