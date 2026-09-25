import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getWordExamples,
  insertExamples,
  deleteWordExample,
} from '@/app/lib/actions/examples';
import { sql } from '@/app/lib/db';
import { truncateAll } from '../setup/db';
import { createTestCourse, createTestUser, createTestWord } from '../fixtures/factories';
import { fetchExamples } from '@/app/lib/data';

describe('actions/examples', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('insertExamples', () => {
    it('inserts multiple examples for a word', async () => {
      await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'example' });

      const result = await insertExamples(word.id, [
        'First example sentence.',
        'Second example sentence.',
      ]);
      expect(result?.message).toBeUndefined();

      const fetched = await fetchExamples({ wordId: word.id });
      expect(fetched?.examples).toHaveLength(2);
      expect(fetched?.examples).toContain('First example sentence.');
      expect(fetched?.examples).toContain('Second example sentence.');
    });
  });

  describe('deleteWordExample', () => {
    it('deletes an example by word id and example text', async () => {
      await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id);
      await insertExamples(word.id, ['To delete', 'To keep']);

      const result = await deleteWordExample(word.id, 'To delete');
      expect(result).toBeUndefined();

      const fetched = await fetchExamples({ wordId: word.id });
      expect(fetched?.examples).toHaveLength(1);
      expect(fetched?.examples).toContain('To keep');
    });
  });

  describe('getWordExamples', () => {
    it('does not generate examples when the user cannot change shared dictionaries', async () => {
      await createTestUser({ canChangeSharedDicts: false });
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'quiet' });

      const result = await getWordExamples(word.id);
      expect(result.examples).toEqual([]);
      const count = await sql<{ count: string }>`
        SELECT count(*)::text AS count FROM examples WHERE word_id = ${word.id}
      `;
      expect(count.rows[0]?.count).toBe('0');
    });

    it('returns stored examples without generating when the flag is off', async () => {
      await createTestUser({ canChangeSharedDicts: false });
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'stored' });
      await sql`
        INSERT INTO examples (word_id, example)
        VALUES (${word.id}, 'A stored sentence.')
      `;

      const result = await getWordExamples(word.id);
      expect(result.examples).toEqual(['A stored sentence.']);
    });
  });
});
