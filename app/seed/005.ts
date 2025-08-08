import { client } from './client';

async function createExamplesTable() {
  console.info('Creating examples table');

  await client.sql`
    CREATE TABLE IF NOT EXISTS examples (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      word_id UUID NOT NULL,
      example TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `;
}

const batch = () => Promise.all([createExamplesTable()]);

export default batch;
