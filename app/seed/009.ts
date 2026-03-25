import { client } from './client';

async function alterUsersTable() {
  console.info('Alter table users to add is_admin column');

  await client.sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
  `;
}

const batch = () => Promise.all([alterUsersTable()]);

export default batch;
