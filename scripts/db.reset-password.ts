#!/usr/bin/env -S pnpm tsx
/**
 * Reset a user's password in the database (bcrypt, same as the app).
 * Uses POSTGRES_URL from .env. Invalidates existing sessions via token_version.
 *
 * Usage:
 *   pnpm db:reset-password -- <email> <new-password>
 */
import dotenv from 'dotenv';

import { PASSWORD_MIN_LENGTH } from '../app/constants';

dotenv.config({ quiet: true });

function usage(): never {
  console.error('Usage: pnpm db:reset-password -- <email> <new-password>');
  process.exit(1);
}

function parseArgs(argv: string[]): { email: string; password: string } {
  const args = argv.filter((a) => a !== '--');
  if (args.length !== 2) usage();
  const [email, password] = args;
  if (!email || !password) usage();
  return { email, password };
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      'POSTGRES_URL is not set. Copy .env.example to .env and configure it first.',
    );
  }

  const { email, password } = parseArgs(process.argv.slice(2));
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  const { client } = await import('../app/seed/client');
  const bcrypt = (await import('bcrypt')).default;

  const existing = await client.sql`
    SELECT id, email FROM users WHERE lower(email) = ${email.toLowerCase()}
  `;
  if (existing.rows.length === 0) {
    throw new Error(`No user found with email "${email}".`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await client.sql`
    UPDATE users
    SET password = ${hashedPassword},
        token_version = token_version + 1
    WHERE id = ${existing.rows[0].id}
  `;

  console.info(
    `Password reset for "${existing.rows[0].email}". Existing sessions were invalidated.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Password reset failed:', error);
    process.exit(1);
  });
