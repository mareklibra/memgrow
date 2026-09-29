'use server';

import { sql } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { genericErrorMessage } from '@/app/lib/i18n/action-error';
import { getI18n } from '@/app/lib/i18n/get-i18n';
import {
  courseEditDenied,
  courseUseDenied,
  isUserAdmin,
  sharedDictChangeDenied,
} from '@/app/lib/data';

export async function updateCourse(courseId: string, course: { courseCode: string }) {
  const denied = await courseEditDenied(courseId);
  if (denied) return { message: denied };
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
    const denied = await courseUseDenied(courseId);
    if (denied) return { message: denied };
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
  const denied = await sharedDictChangeDenied();
  if (denied) return { message: denied };
  try {
    const result = await sql<{ id: string }>`
        INSERT INTO courses (name, known_lang, learning_lang, course_code, is_public, owner_user_id)
        VALUES (${course.name.trim()}, ${course.knownLang.trim()}, ${course.learningLang.trim()}, ${course.courseCode.trim()}, TRUE, NULL)
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

export async function createPrivateCourse(course: {
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
}) {
  try {
    const myAuth = await auth();
    const userId = myAuth?.user?.id;
    if (!userId) {
      const { t } = await getI18n();
      return { message: t('errors.notAuthenticated') };
    }
    const result = await sql<{ id: string }>`
        INSERT INTO courses (name, known_lang, learning_lang, course_code, owner_user_id, is_public)
        VALUES (
          ${course.name.trim()},
          ${course.knownLang.trim()},
          ${course.learningLang.trim()},
          ${course.courseCode.trim()},
          ${userId},
          FALSE
        )
        RETURNING id
    `;
    const newCourseId = result.rows[0]?.id;
    if (newCourseId) {
      await upsertCoursePriority(newCourseId, 1);
    }
    revalidatePath('/edit');
    revalidatePath('/learn');
    revalidatePath('/test');
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to create course'),
    };
  }
}

export async function promoteCourse(courseId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const { t } = await getI18n();
  if (!userId) return { message: t('errors.notAuthenticated') };
  if (!(await isUserAdmin(userId))) return { message: t('errors.cannotEditCourse') };
  try {
    await sql`
      UPDATE courses
      SET is_public = TRUE
      WHERE id = ${courseId}
    `;
    revalidatePath('/settings');
    revalidatePath('/learn');
    revalidatePath('/test');
    revalidatePath('/edit');
  } catch (e) {
    return {
      message: await genericErrorMessage(e, 'Failed to promote course'),
    };
  }
}
