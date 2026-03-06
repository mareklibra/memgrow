/**
 * Creates a sql-like interface using pg Pool, compatible with @vercel/postgres usage.
 * Used to mock @vercel/postgres in tests since it uses Neon's WebSocket driver
 * which doesn't work with standard Postgres (e.g. Testcontainers).
 */
import { Pool } from 'pg';

function buildTaggedQuery(
  strings: TemplateStringsArray,
  values: unknown[],
): {
  text: string;
  values: unknown[];
} {
  let text = strings[0];
  const valuesOut: unknown[] = [];
  for (let i = 0; i < values.length; i++) {
    valuesOut.push(values[i]);
    text += `$${i + 1}` + (strings[i + 1] ?? '');
  }
  return { text, values: valuesOut };
}

export function createPgSqlAdapter(connectionString: string) {
  const pool = new Pool({ connectionString });

  const sql = Object.assign(
    async function <O extends Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) {
      const { text, values: vals } = buildTaggedQuery(strings, values);
      const result = await pool.query(text, vals);
      return { rows: result.rows as O[], rowCount: result.rowCount ?? 0 };
    },
    {
      query: async function <O extends Record<string, unknown>>(
        text: string,
        values?: unknown[],
      ) {
        const result = await pool.query(text, values ?? []);
        return { rows: result.rows as O[], rowCount: result.rowCount ?? 0 };
      },
    },
  );

  return { sql, pool };
}

/**
 * Creates the mock module for @vercel/postgres. Reads connection string from env.
 * Used by vi.mock in env.ts.
 */
export function createPgSql(): { sql: ReturnType<typeof createPgSqlAdapter>['sql'] } {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      'POSTGRES_URL not set. Tests require .test-env.json from global-setup (Testcontainers).',
    );
  }
  const { sql } = createPgSqlAdapter(url);
  return { sql };
}
