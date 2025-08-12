'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

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

export async function createCourse(course: {
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
}) {
  try {
    await sql`
        INSERT INTO courses (name, known_lang, learning_lang, course_code)
        VALUES (${course.name.trim()}, ${course.knownLang.trim()}, ${course.learningLang.trim()}, ${course.courseCode.trim()})
      `;
    revalidatePath('/edit');
  } catch (e) {
    return {
      message: `Database Error: Failed to create course. ${JSON.stringify(e)}`,
    };
  }
}
