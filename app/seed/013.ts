import { client } from './client';

async function alterUsersLocale() {
  console.info('Alter table users to add locale column');

  await client.sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS locale VARCHAR(8);
  `;
}

const batch = () => Promise.all([alterUsersLocale()]);

export default batch;
