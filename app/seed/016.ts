import { client } from './client';

async function addProgressUpdatedAt() {
  console.info('Ensure user_progress unique (user_id, word_id) and updated_at');

  const existing = await client.sql`
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_word'
      AND conrelid = 'public.user_progress'::regclass
  `;

  if (existing.rows.length === 0) {
    await client.sql`
      DELETE FROM user_progress AS older
      USING user_progress AS newer
      WHERE older.user_id = newer.user_id
        AND older.word_id = newer.word_id
        AND (
          older.created_at < newer.created_at
          OR (
            older.created_at = newer.created_at
            AND older.ctid < newer.ctid
          )
        )
    `;
    await client.sql`
      ALTER TABLE user_progress
      ADD CONSTRAINT unique_user_word UNIQUE (user_id, word_id)
    `;
  }

  await client.sql`
    ALTER TABLE user_progress
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
  `;
}

const batch = () => addProgressUpdatedAt();

export default batch;
