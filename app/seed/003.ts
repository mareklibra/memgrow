import { client } from './client';

async function createSoundsTable() {
  console.info('Alter table user_progress to add is_priority column');

  await client.sql`
    ALTER TABLE user_progress
    ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;
  `;
}

const batch = () => Promise.all([createSoundsTable()]);

export default batch;
