import { Pool as NeonPool, PoolClient as NeonPoolClient } from '@neondatabase/serverless';
import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';

type SeedClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any>;
};

// Calling `.query()` on a NeonPoolClient | PgPoolClient union directly isn't
// callable (TS can't resolve compatible overloads across the union), even
// though both drivers accept the same (text, values) shape at runtime.
type MinimalQueryable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (text: string, values?: unknown[]) => Promise<any>;
};

function buildQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + (strings[i + 1] ?? '');
  }
  return { text, values };
}

/**
 * DB_PROVIDER=pg targets a plain Postgres server (self-hosted); defaults to
 * the Neon driver for the Vercel + Neon production deployment.
 *
 * The connection is established lazily, on first `.sql()` call, rather than
 * at module load - this module is imported by scripts/db.seed.ts, which
 * needs to load `dotenv` first so POSTGRES_URL/DB_PROVIDER are set before a
 * connection is attempted.
 */
let clientPromise: Promise<NeonPoolClient | PgPoolClient> | null = null;

function getClient(): Promise<NeonPoolClient | PgPoolClient> {
  if (!clientPromise) {
    const pool =
      process.env.DB_PROVIDER === 'pg'
        ? new PgPool({ connectionString: process.env.POSTGRES_URL })
        : new NeonPool({ connectionString: process.env.POSTGRES_URL });
    clientPromise = pool.connect();
  }
  return clientPromise;
}

export const client: SeedClient = {
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const pgClient = await getClient();
    const { text, values: params } = buildQuery(strings, values);
    return (pgClient as MinimalQueryable).query(text, params);
  },
};
