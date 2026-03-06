import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCourse, updateCourse } from '@/app/lib/actions/course';
import { truncateAll } from '../setup/db';
import { createTestCourse } from '../fixtures/factories';
import { fetchCourse, fetchCourses } from '@/app/lib/data';

describe('actions/course', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('createCourse', () => {
    it('creates a new course', async () => {
      const result = await createCourse({
        name: 'New Course',
        knownLang: 'English',
        learningLang: 'French',
        courseCode: 'fr',
      });
      expect(result?.message).toBeUndefined();

      const courses = await fetchCourses();
      const c = courses.find((x) => x.name === 'New Course');
      expect(c).toBeDefined();
      expect(c?.courseCode).toBe('fr');
    });
  });

  describe('updateCourse', () => {
    it('updates course_code', async () => {
      const course = await createTestCourse({
        name: 'To Update',
        courseCode: 'en',
      });

      const result = await updateCourse(course.id, { courseCode: 'de' });
      expect(result?.message).toBeUndefined();

      const fetched = await fetchCourse(course.id);
      expect(fetched?.courseCode).toBe('de');
    });
  });
});
