import { sql } from '@/app/lib/db';

const TABLES = [
  'examples',
  'sounds',
  'user_progress',
  'words',
  'courses',
  'password_reset_tokens',
  'password_reset_rate_limits',
  'users',
] as const;

/**
 * Truncate all tables (in correct FK order) for test isolation.
 * Call in afterEach or beforeEach.
 */
export async function truncateAll(): Promise<void> {
  await sql.query(`TRUNCATE ${TABLES.join(', ')} CASCADE`);
}
