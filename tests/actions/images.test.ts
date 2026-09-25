import { beforeEach, describe, expect, it } from 'vitest';
import { requestImageGeneration } from '@/app/lib/actions/images';
import { createTranslator } from '@/app/lib/i18n';
import { sql } from '@/app/lib/db';
import { truncateAll } from '../setup/db';
import { createTestCourse, createTestUser, createTestWord } from '../fixtures/factories';

const t = createTranslator('en');

describe('actions/images', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('does not queue an image request without the shared-dictionary flag', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    const course = await createTestCourse();
    const word = await createTestWord(course.id);

    const result = await requestImageGeneration(word.id);
    expect(result.message).toBe(t('errors.cannotChangeSharedDicts'));

    const count = await sql<{ count: string }>`
      SELECT count(*)::text AS count FROM image_requests WHERE word_id = ${word.id}
    `;
    expect(count.rows[0]?.count).toBe('0');
  });
});
