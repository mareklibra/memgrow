import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/pending-batch.test.ts',
      'tests/test-session-simulation.test.ts',
      'tests/iterate-words-logic.test.ts',
      'tests/word-transitions.test.ts',
      'tests/simulate.test.ts',
      'tests/utils.test.ts',
      'tests/i18n/integrity.test.ts',
      'tests/i18n/translator.test.ts',
      'tests/i18n/resolve-locale.test.ts',
      'tests/i18n/format.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
