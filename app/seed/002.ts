import { client } from './client';

async function createSoundsTable() {
  console.info('Creating sounds table');

  await client.sql`
    CREATE TABLE IF NOT EXISTS sounds (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      word_id UUID NOT NULL,
      audio_source_base64 TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `;
}

const batch = () => Promise.all([createSoundsTable()]);

export default batch;
