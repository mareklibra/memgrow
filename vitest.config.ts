import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    env: {
      TESTCONTAINERS_RYUK_DISABLED: 'true',
    },
    globalSetup: './tests/setup/global-setup.ts',
    setupFiles: ['./tests/setup/env.ts'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
    maxWorkers: 12,
    // Integration tests (data.test.ts, actions/) share a single Testcontainers
    // PostgreSQL database and truncate tables between tests, so they cannot run
    // in parallel. Vitest's fileParallelism is root-level only (cannot differ
    // per project), so all files must run sequentially.
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
