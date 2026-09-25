import { client } from './client';

async function addSharedDictFlagAndRegistrationLimit() {
  console.info('Add can_change_shared_dicts and registration_rate_limits');

  await client.sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS can_change_shared_dicts BOOLEAN NOT NULL DEFAULT FALSE;
  `;

  await client.sql`
    UPDATE users
    SET can_change_shared_dicts = TRUE
    WHERE is_admin;
  `;

  await client.sql`
    CREATE TABLE IF NOT EXISTS registration_rate_limits (
      ip TEXT PRIMARY KEY,
      last_attempt_at TIMESTAMPTZ NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL
    );
  `;
}

const batch = () => addSharedDictFlagAndRegistrationLimit();

export default batch;
