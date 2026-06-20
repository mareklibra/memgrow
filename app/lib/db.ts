import { neon, Pool, NeonQueryFunction } from '@neondatabase/serverless';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult<T = any> = { rows: T[]; rowCount: number };

type SqlTaggedTemplate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T = any>(strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult<T>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: <T = any>(text: string, values?: unknown[]) => Promise<QueryResult<T>>;
};

/**
 * Creates a database access layer wrapping @neondatabase/serverless.
 *
 * This abstraction was introduced to replace the deprecated @vercel/postgres
 * package while preserving the same API surface ({rows, rowCount} result shape
 * and a .query() method) so that all existing call-sites remain unchanged.
 *
 * Tagged templates use Neon's HTTP transport with fullResults:true to obtain
 * the real PostgreSQL rowCount (number of affected rows for DML statements).
 * The .query() method uses a connection Pool for parameterized queries.
 */
function createSql(): SqlTaggedTemplate {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const neonSql: NeonQueryFunction<false, true> = neon(connectionString, {
    fullResults: true,
  });
  const pool = new Pool({ connectionString });

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

export const sql: SqlTaggedTemplate = createSql();
