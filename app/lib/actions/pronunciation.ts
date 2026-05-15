'use server';

import { sql } from '@vercel/postgres';
import { DeleteSoundResult } from '../types';

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

export async function deletePronunciation(wordId: string): Promise<DeleteSoundResult> {
  try {
    await sql.query(`DELETE FROM sounds WHERE word_id = $1`, [wordId]);
    return undefined;
  } catch (e) {
    return {
      message: `Database Error: Failed to delete sound. ${JSON.stringify(e)}`,
    };
  }
}
