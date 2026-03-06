import { sql } from '@vercel/postgres';

const TABLES = [
  'examples',
  'sounds',
  'user_progress',
  'words',
  'courses',
  'users',
] as const;

/**
 * Truncate all tables (in correct FK order) for test isolation.
 * Call in afterEach or beforeEach.
 */
export async function truncateAll(): Promise<void> {
  await sql.query(`TRUNCATE ${TABLES.join(', ')} CASCADE`);
}
