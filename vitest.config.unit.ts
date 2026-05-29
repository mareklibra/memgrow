import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/test-session-simulation.test.ts',
      'tests/iterate-words-logic.test.ts',
      'tests/word-transitions.test.ts',
      'tests/simulate.test.ts',
      'tests/utils.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
