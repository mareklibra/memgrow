'use server';

import { sql } from '@/app/lib/db';
import { DeleteSoundResult } from '../types';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { sharedDictChangeDenied } from '@/app/lib/data';

export async function insertPronunciation(wordId: string, content: Buffer) {
  const denied = await sharedDictChangeDenied();
  if (denied) return { message: denied };
  const result = await sql.query(
    `INSERT INTO sounds (word_id, content)
     VALUES ($1, $2)
     RETURNING id`,
    [wordId, content],
  );

  return { id: result.rows[0].id };
}

export async function deletePronunciation(wordId: string): Promise<DeleteSoundResult> {
  const denied = await sharedDictChangeDenied();
  if (denied) return { message: denied };
  try {
    await sql.query(`DELETE FROM sounds WHERE word_id = $1`, [wordId]);
    return undefined;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to delete sound'),
    };
  }
}
