import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/auth';
import { createTranslator } from '@/app/lib/i18n';
import { sql } from '@/app/lib/db';
import {
  createPrivateCourse,
  createCourse,
  promoteCourse,
  updateCourse,
  upsertCoursePriority,
  addWord,
  requestImageGeneration,
  generateWordImage,
  insertPronunciation,
  queryWordImages,
} from '@/app/lib/actions';
import { fetchCourse, fetchCourses, fetchWord, fetchWordImageById } from '@/app/lib/data';
import { truncateAll } from '../setup/db';
import { createTestCourse, createTestUser, createTestWord } from '../fixtures/factories';
import { mockAuthUser } from '../setup/auth-mock';

const t = createTranslator('en');
const otherUser = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Other',
  email: 'other@example.com',
};

describe('course access', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.mocked(auth).mockResolvedValue({ user: mockAuthUser } as never);
  });

  afterEach(async () => {
    await truncateAll();
    vi.mocked(auth).mockResolvedValue({ user: mockAuthUser } as never);
  });

  it('lets the owner see a private course and hides it from another user', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    await createTestUser({
      id: otherUser.id,
      name: otherUser.name,
      email: otherUser.email,
      canChangeSharedDicts: false,
    });
    await createPrivateCourse({
      name: 'Mine',
      knownLang: 'English',
      learningLang: 'Czech',
      courseCode: 'cs',
    });

    const mine = await fetchCourses();
    const owned = mine.find((course) => course.name === 'Mine');
    expect(owned?.isPublic).toBe(false);
    expect(owned?.ownedByMe).toBe(true);
    expect(owned?.coursePriority).toBe(1);

    vi.mocked(auth).mockResolvedValue({ user: otherUser } as never);
    const theirs = await fetchCourses();
    expect(theirs.find((course) => course.name === 'Mine')).toBeUndefined();
    expect(await fetchCourse(owned!.id)).toBeUndefined();
  });

  it('keeps a shared-editor course public with no owner', async () => {
    await createTestUser({ canChangeSharedDicts: true });
    await createCourse({
      name: 'Shared',
      knownLang: 'English',
      learningLang: 'French',
      courseCode: 'fr',
    });
    const row = await sql<{ is_public: boolean; owner_user_id: string | null }>`
      SELECT is_public, owner_user_id FROM courses WHERE name = 'Shared'
    `;
    expect(row.rows[0]?.is_public).toBe(true);
    expect(row.rows[0]?.owner_user_id).toBeNull();
  });

  it('lets the owner add a word and blocks another user', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    await createTestUser({
      id: otherUser.id,
      name: otherUser.name,
      email: otherUser.email,
      canChangeSharedDicts: false,
    });
    const course = await createTestCourse({
      name: 'Private',
      ownerUserId: mockAuthUser.id,
      isPublic: false,
    });
    const added = await addWord({
      word: 'secret',
      definition: 'hidden',
      courseId: course.id,
    });
    expect(added?.message).toBeUndefined();

    vi.mocked(auth).mockResolvedValue({ user: otherUser } as never);
    expect(await fetchWord(added!.id!)).toBeUndefined();
    const blocked = await addWord({
      word: 'nope',
      definition: 'no',
      courseId: course.id,
    });
    expect(blocked?.message).toBe(t('errors.courseNotFound', { id: course.id }));
  });

  it('lets a learner request a picture and blocks generation without edit permission', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    const course = await createTestCourse({ isPublic: true });
    const word = await createTestWord(course.id, { word: 'public' });

    const requested = await requestImageGeneration(word.id);
    expect(requested.message).toBeUndefined();

    const generated = await generateWordImage(word.id);
    expect(generated.message).toBe(t('errors.cannotEditCourse'));

    const sound = await insertPronunciation(word.id, Buffer.from('mp3'));
    expect(sound.message).toBe(t('errors.cannotEditCourse'));
  });

  it('hides private image bytes and image lists from another user', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    await createTestUser({
      id: otherUser.id,
      name: otherUser.name,
      email: otherUser.email,
      canChangeSharedDicts: false,
    });
    const course = await createTestCourse({
      ownerUserId: mockAuthUser.id,
      isPublic: false,
    });
    const word = await createTestWord(course.id);
    const image = await sql<{ id: string }>`
      INSERT INTO word_images (word_id, content)
      VALUES (${word.id}, ${Buffer.from('img')})
      RETURNING id
    `;

    vi.mocked(auth).mockResolvedValue({ user: otherUser } as never);
    expect(await fetchWordImageById(image.rows[0].id)).toBeUndefined();
    const listed = await queryWordImages(word.id);
    expect(listed.message).toBe(t('errors.courseNotFound', { id: course.id }));
    expect(listed.images).toBeUndefined();
  });

  it('denies priority updates for a course the user cannot use', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    await createTestUser({
      id: otherUser.id,
      name: otherUser.name,
      email: otherUser.email,
      canChangeSharedDicts: false,
    });
    const course = await createTestCourse({
      ownerUserId: mockAuthUser.id,
      isPublic: false,
    });
    vi.mocked(auth).mockResolvedValue({ user: otherUser } as never);
    const result = await upsertCoursePriority(course.id, 1);
    expect(result?.message).toBe(t('errors.courseNotFound', { id: course.id }));
  });

  it('promotes only for an admin and keeps the owner', async () => {
    await createTestUser({ is_admin: false, canChangeSharedDicts: false });
    const course = await createTestCourse({
      ownerUserId: mockAuthUser.id,
      isPublic: false,
    });
    const denied = await promoteCourse(course.id);
    expect(denied?.message).toBe(t('errors.cannotEditCourse'));

    await sql`UPDATE users SET is_admin = TRUE WHERE id = ${mockAuthUser.id}`;
    const promoted = await promoteCourse(course.id);
    expect(promoted?.message).toBeUndefined();
    const row = await sql<{ is_public: boolean; owner_user_id: string }>`
      SELECT is_public, owner_user_id FROM courses WHERE id = ${course.id}
    `;
    expect(row.rows[0]?.is_public).toBe(true);
    expect(row.rows[0]?.owner_user_id).toBe(mockAuthUser.id);
  });

  it('denies a learner edits on a public course', async () => {
    await createTestUser({ canChangeSharedDicts: false });
    const course = await createTestCourse({ isPublic: true });
    const result = await updateCourse(course.id, { courseCode: 'de' });
    expect(result?.message).toBe(t('errors.cannotEditCourse'));
    const word = await addWord({
      word: 'no',
      definition: 'no',
      courseId: course.id,
    });
    expect(word?.message).toBe(t('errors.cannotEditCourse'));
  });
});
