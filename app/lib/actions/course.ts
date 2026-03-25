'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function updateCourse(courseId: string, course: { courseCode: string }) {
  try {
    await sql`
        UPDATE courses
        SET course_code = ${course.courseCode}
        WHERE id = ${courseId}
      `;
  } catch (e) {
    return {
      message: `Database Error: Failed to update course. ${JSON.stringify(e)}`,
    };
  }
}

export async function upsertCoursePriority(courseId: string, priority: number) {
  try {
    const myAuth = await auth();
    const userId = myAuth?.user?.id;
    if (!userId) {
      return { message: 'Not authenticated.' };
    }
    await sql`
        INSERT INTO user_course (user_id, course_id, priority)
        VALUES (${userId}, ${courseId}, ${priority})
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET priority = ${priority}
      `;
  } catch (e) {
    return {
      message: `Database Error: Failed to upsert course priority. ${JSON.stringify(e)}`,
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
      message: `Database Error: Failed to create course. ${JSON.stringify(e)}`,
    };
  }
}
