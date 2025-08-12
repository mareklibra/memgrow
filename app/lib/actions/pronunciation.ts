'use server';

import { sql } from '@vercel/postgres';

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
