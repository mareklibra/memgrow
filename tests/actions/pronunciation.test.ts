import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { insertPronunciation } from '@/app/lib/actions/pronunciation';
import { truncateAll } from '../setup/db';
import { createTestCourse, createTestWord } from '../fixtures/factories';
import { fetchPronunciation } from '@/app/lib/data';

describe('actions/pronunciation', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('insertPronunciation', () => {
    it('inserts pronunciation for a word', async () => {
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'pronounce' });

      const audioBuffer = Buffer.from('testaudiodata');
      const result = await insertPronunciation(word.id, audioBuffer);
      expect(result?.id).toBeDefined();

      const fetched = await fetchPronunciation({ id: word.id, courseId: course.id });
      expect(fetched?.audioContent).toBeDefined();
      expect(Buffer.from(fetched!.audioContent!).toString()).toBe('testaudiodata');
    });
  });
});
