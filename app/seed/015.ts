import { client } from './client';

async function addPasswordResetTables() {
  console.info('Create password_reset_tokens and password_reset_rate_limits tables');

  await client.sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT unique_password_reset_user UNIQUE (user_id)
    );
  `;

  await client.sql`
    CREATE TABLE IF NOT EXISTS password_reset_rate_limits (
      kind TEXT NOT NULL CHECK (kind IN ('email', 'ip')),
      key TEXT NOT NULL,
      last_attempt_at TIMESTAMPTZ NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (kind, key)
    );
  `;
}

const batch = () => Promise.all([addPasswordResetTables()]);

export default batch;
