import { Pool, PoolClient } from '@neondatabase/serverless';

type SeedClient = PoolClient & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any>;
};

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const pgClient = await pool.connect();

function buildQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + (strings[i + 1] ?? '');
  }
  return { text, values };
}

export const client = Object.assign(pgClient, {
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const { text, values: params } = buildQuery(strings, values);
    return pgClient.query(text, params);
  },
}) as SeedClient;
