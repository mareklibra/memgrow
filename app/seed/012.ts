import { client } from './client';

async function migrateSoundsToByteaContent() {
  console.info('Migrating sounds table: base64 TEXT -> binary BYTEA');

  await client.sql`ALTER TABLE sounds ADD COLUMN IF NOT EXISTS content BYTEA`;

  const hasOldColumn = await client.sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sounds' AND column_name = 'audio_source_base64'
  `;

  if (hasOldColumn.rows.length > 0) {
    await client.sql`
      UPDATE sounds
      SET content = decode(audio_source_base64, 'base64')
      WHERE content IS NULL AND audio_source_base64 IS NOT NULL
    `;
    await client.sql`ALTER TABLE sounds DROP COLUMN audio_source_base64`;
  } else {
    console.info('sounds.audio_source_base64 already removed, skipping data migration');
  }

  await client.sql`ALTER TABLE sounds ALTER COLUMN content SET NOT NULL`;
}

const batch = () => Promise.all([migrateSoundsToByteaContent()]);

export default batch;
