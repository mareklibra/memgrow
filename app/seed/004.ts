import { client } from './client';

async function alterCoursesTable() {
  console.info('Alter table courses to add course_code column');

  // ISO 639-1 code
  await client.sql`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS course_code VARCHAR(8) NOT NULL DEFAULT 'en';
  `;
}

const batch = () => Promise.all([alterCoursesTable()]);

export default batch;
