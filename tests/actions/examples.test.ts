import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { insertExamples, deleteWordExample } from '@/app/lib/actions/examples';
import { truncateAll } from '../setup/db';
import { createTestCourse, createTestWord } from '../fixtures/factories';
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
});
