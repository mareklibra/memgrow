'use server';

import { sql } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { getI18n } from '@/app/lib/i18n/get-i18n';

export async function updateCourse(courseId: string, course: { courseCode: string }) {
  try {
    await sql`
        UPDATE courses
        SET course_code = ${course.courseCode}
        WHERE id = ${courseId}
      `;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to update course'),
    };
  }
}

export async function upsertCoursePriority(courseId: string, priority: number) {
  try {
    const myAuth = await auth();
    const userId = myAuth?.user?.id;
    if (!userId) {
      const { t } = await getI18n();
      return { message: t('errors.notAuthenticated') };
    }
    await sql`
        INSERT INTO user_course (user_id, course_id, priority)
        VALUES (${userId}, ${courseId}, ${priority})
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET priority = ${priority}
      `;
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to upsert course priority'),
    };
  }
}

export async function createCourse(course: {
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
}) {
  try {
    const result = await sql<{ id: string }>`
        INSERT INTO courses (name, known_lang, learning_lang, course_code)
        VALUES (${course.name.trim()}, ${course.knownLang.trim()}, ${course.learningLang.trim()}, ${course.courseCode.trim()})
        RETURNING id
      `;
    const newCourseId = result.rows[0]?.id;
    if (newCourseId) {
      await upsertCoursePriority(newCourseId, 1);
    }
    revalidatePath('/edit');
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to create course'),
    };
  }
}
