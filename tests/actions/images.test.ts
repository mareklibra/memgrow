import { beforeEach, describe, expect, it } from 'vitest';
import { requestImageGeneration } from '@/app/lib/actions/images';
import { sql } from '@/app/lib/db';
import { truncateAll } from '../setup/db';
import { createTestCourse, createTestUser, createTestWord } from '../fixtures/factories';

describe('actions/images', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('queues an image request for a course the user can use', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    const course = await createTestCourse();
    const word = await createTestWord(course.id);

    const result = await requestImageGeneration(word.id);
    expect(result.message).toBeUndefined();

    const count = await sql<{ count: string }>`
      SELECT count(*)::text AS count FROM image_requests WHERE word_id = ${word.id}
    `;
    expect(count.rows[0]?.count).toBe('1');
  });
});
