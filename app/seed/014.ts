import { client } from './client';

async function addTokenVersionAndNormalizeEmails() {
  console.info('Alter table users to add token_version column');

  await client.sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
  `;

  console.info('Normalize users.email to lowercase');
  await client.sql`
    UPDATE users SET email = lower(email) WHERE email <> lower(email);
  `;
}

const batch = () => Promise.all([addTokenVersionAndNormalizeEmails()]);

export default batch;
