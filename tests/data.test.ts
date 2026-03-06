import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  fetchAllWords,
  fetchCourse,
  fetchCourses,
  fetchExamples,
  fetchPronunciation,
  fetchWord,
  fetchWordsToLearn,
  fetchWordsToTest,
  getUserForAuth,
} from '@/app/lib/data';
import { truncateAll } from './setup/db';
import {
  createTestCourse,
  createTestUser,
  createTestUserProgress,
  createTestWord,
} from './fixtures/factories';

describe('data', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('getUserForAuth', () => {
    it('returns user by email when exists', async () => {
      await createTestUser({ email: 'auth@test.com' });
      const user = await getUserForAuth('auth@test.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('auth@test.com');
      expect(user?.password).toBeDefined();
    });

    it('returns undefined when user does not exist', async () => {
      const user = await getUserForAuth('nonexistent@test.com');
      expect(user).toBeUndefined();
    });
  });

  describe('fetchWordsToLearn', () => {
    it('returns words with no progress (memlevel 0 or null)', async () => {
      const course = await createTestCourse();
      await createTestWord(course.id, { word: 'learn1' });
      await createTestWord(course.id, { word: 'learn2' });

      const words = await fetchWordsToLearn(course.id, 10);
      expect(words).toHaveLength(2);
      expect(words.map((w) => w.word)).toContain('learn1');
      expect(words.map((w) => w.word)).toContain('learn2');
    });

    it('excludes words with progress (memlevel > 0)', async () => {
      const user = await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'learned' });
      await createTestUserProgress(user.id, word.id, { memlevel: 1 });

      const words = await fetchWordsToLearn(course.id, 10);
      expect(words).toHaveLength(0);
    });

    it('excludes skipped words', async () => {
      const user = await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'skipped' });
      await createTestUserProgress(user.id, word.id, {
        memlevel: 0,
        isSkipped: true,
      });

      const words = await fetchWordsToLearn(course.id, 10);
      expect(words).toHaveLength(0);
    });

    it('respects limit', async () => {
      const course = await createTestCourse();
      await createTestWord(course.id, { word: 'a' });
      await createTestWord(course.id, { word: 'b' });
      await createTestWord(course.id, { word: 'c' });

      const words = await fetchWordsToLearn(course.id, 2);
      expect(words).toHaveLength(2);
    });
  });

  describe('fetchWordsToTest', () => {
    it('returns words with memlevel > 0 and repeat_again in past', async () => {
      const user = await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'totest' });
      await createTestUserProgress(user.id, word.id, {
        memlevel: 1,
        repeatAgain: new Date(Date.now() - 86400000),
      });

      const words = await fetchWordsToTest(course.id, 10, false, 0);
      expect(words.length).toBeGreaterThanOrEqual(1);
      expect(words.some((w) => w.word === 'totest')).toBe(true);
    });

    it('excludes words with repeat_again in future', async () => {
      const user = await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'future' });
      await createTestUserProgress(user.id, word.id, {
        memlevel: 1,
        repeatAgain: new Date(Date.now() + 86400000),
      });

      const words = await fetchWordsToTest(course.id, 10, false, 0);
      expect(words.every((w) => w.word !== 'future')).toBe(true);
    });

    it('includes priority words even when repeat_again in future', async () => {
      const user = await createTestUser();
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'priority' });
      await createTestUserProgress(user.id, word.id, {
        memlevel: 1,
        repeatAgain: new Date(Date.now() + 86400000),
        isPriority: true,
      });

      const words = await fetchWordsToTest(course.id, 10, true, 0);
      expect(words.some((w) => w.word === 'priority')).toBe(true);
    });
  });

  describe('fetchAllWords', () => {
    it('returns all words in course with progress', async () => {
      const user = await createTestUser();
      const course = await createTestCourse();
      const w1 = await createTestWord(course.id, { word: 'one' });
      await createTestWord(course.id, { word: 'two' });
      await createTestUserProgress(user.id, w1.id, { memlevel: 1 });

      const words = await fetchAllWords(course.id);
      expect(words).toHaveLength(2);
      const one = words.find((w) => w.word === 'one');
      expect(one?.memLevel).toBe(1);
      const two = words.find((w) => w.word === 'two');
      expect(two?.memLevel).toBe(0);
    });
  });

  describe('fetchWord', () => {
    it('returns single word by id', async () => {
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'single' });

      const fetched = await fetchWord(word.id);
      expect(fetched).toBeDefined();
      expect(fetched?.word).toBe('single');
      expect(fetched?.id).toBe(word.id);
    });
  });

  describe('fetchCourses', () => {
    it('returns courses with stats', async () => {
      const user = await createTestUser();
      const course = await createTestCourse({ name: 'My Course' });
      const word = await createTestWord(course.id);
      await createTestUserProgress(user.id, word.id, {
        memlevel: 0,
        repeatAgain: new Date(Date.now() - 86400000),
      });

      const courses = await fetchCourses();
      expect(courses.length).toBeGreaterThanOrEqual(1);
      const c = courses.find((x) => x.name === 'My Course');
      expect(c).toBeDefined();
      expect(Number(c?.total)).toBe(1);
      expect(Number(c?.toLearn)).toBe(1);
    });
  });

  describe('fetchCourse', () => {
    it('returns course by id', async () => {
      const course = await createTestCourse({ name: 'Solo' });
      const fetched = await fetchCourse(course.id);
      expect(fetched?.name).toBe('Solo');
      expect(fetched?.id).toBe(course.id);
    });

    it('returns undefined for unknown id', async () => {
      const fetched = await fetchCourse('00000000-0000-0000-0000-000000000000');
      expect(fetched).toBeUndefined();
    });
  });

  describe('fetchPronunciation', () => {
    it('returns word with audio when sound exists', async () => {
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'pronounce' });
      const { sql } = await import('@vercel/postgres');
      await sql`INSERT INTO sounds (word_id, audio_source_base64) VALUES (${word.id}, 'base64audio')`;

      const result = await fetchPronunciation({ id: word.id, courseId: course.id });
      expect(result?.audioSourceB64).toBe('base64audio');
      expect(result?.word).toBe('pronounce');
    });

    it('returns undefined when word not found', async () => {
      const course = await createTestCourse();
      const result = await fetchPronunciation({
        id: '00000000-0000-0000-0000-000000000000',
        courseId: course.id,
      });
      expect(result).toBeUndefined();
    });
  });

  describe('fetchExamples', () => {
    it('returns word with examples when they exist', async () => {
      const course = await createTestCourse();
      const word = await createTestWord(course.id, { word: 'example' });
      const { sql } = await import('@vercel/postgres');
      await sql`INSERT INTO examples (word_id, example) VALUES (${word.id}, 'Example sentence.')`;

      const result = await fetchExamples({ wordId: word.id });
      expect(result?.examples).toContain('Example sentence.');
      expect(result?.word).toBe('example');
    });

    it('returns undefined when word not found', async () => {
      const result = await fetchExamples({
        wordId: '00000000-0000-0000-0000-000000000000',
      });
      expect(result).toBeUndefined();
    });
  });
});
