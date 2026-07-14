import { neon, Pool as NeonPool, NeonQueryFunction } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult<T = any> = { rows: T[]; rowCount: number };

type SqlTaggedTemplate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult<T>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: <T = any>(text: string, values?: unknown[]) => Promise<QueryResult<T>>;
};

function buildTaggedQuery(
  strings: TemplateStringsArray,
  values: unknown[],
): { text: string; values: unknown[] } {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + (strings[i + 1] ?? '');
  }
  return { text, values };
}

/**
 * Plain-Postgres implementation (self-hosted or any standard Postgres server).
 * Used when DB_PROVIDER=pg. Both the tagged template and .query() route
 * through the same pg.Pool.
 */
function createPgSql(connectionString: string): SqlTaggedTemplate {
  const pool = new PgPool({ connectionString });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taggedTemplate = async <T = any>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>> => {
    const { text, values: params } = buildTaggedQuery(strings, values);
    const result = await pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = async <T = any>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> => {
    const result = await pool.query(text, values ?? []);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  };

  return Object.assign(taggedTemplate, { query }) as SqlTaggedTemplate;
}

/**
 * Neon implementation (Vercel production).
 *
 * This abstraction was introduced to replace the deprecated @vercel/postgres
 * package while preserving the same API surface ({rows, rowCount} result shape
 * and a .query() method) so that all existing call-sites remain unchanged.
 *
 * Tagged templates use Neon's HTTP transport with fullResults:true to obtain
 * the real PostgreSQL rowCount (number of affected rows for DML statements).
 * The .query() method uses a connection Pool for parameterized queries.
 */
function createNeonSql(connectionString: string): SqlTaggedTemplate {
  const neonSql: NeonQueryFunction<false, true> = neon(connectionString, {
    fullResults: true,
  });
  const pool = new NeonPool({ connectionString });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taggedTemplate = async <T = any>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>> => {
    const result = await neonSql(strings, ...values);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = async <T = any>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> => {
    const result = await pool.query(text, values ?? []);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  };

  return Object.assign(taggedTemplate, { query }) as SqlTaggedTemplate;
}

/**
 * Creates the database access layer. Set DB_PROVIDER=pg to talk to a plain
 * Postgres server (self-hosted); defaults to Neon's HTTP driver for the
 * Vercel + Neon production deployment.
 */
function createSql(): SqlTaggedTemplate {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  return process.env.DB_PROVIDER === 'pg'
    ? createPgSql(connectionString)
    : createNeonSql(connectionString);
}

export const sql: SqlTaggedTemplate = createSql();
