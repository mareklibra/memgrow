import * as fs from 'fs';
import * as path from 'path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { runSchema } from './schema';

const TEST_ENV_FILE = path.join(process.cwd(), '.test-env.json');

export default async function globalSetup() {
  // Disable Ryuk (container reaper) - often needed for Podman; harmless with Docker
  process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('memgrow_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const connectionString = container.getConnectionUri();
  process.env.POSTGRES_URL = connectionString;

  await runSchema(connectionString);

  fs.writeFileSync(
    TEST_ENV_FILE,
    JSON.stringify({
      POSTGRES_URL: connectionString,
      containerId: container.getId(),
    }),
  );

  (
    globalThis as unknown as { __TEST_CONTAINER__: StartedPostgreSqlContainer }
  ).__TEST_CONTAINER__ = container;

  return async function globalTeardown() {
    await container.stop();
    if (fs.existsSync(TEST_ENV_FILE)) {
      fs.unlinkSync(TEST_ENV_FILE);
    }
  };
}
