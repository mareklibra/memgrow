import { client } from './client';

async function addCourseOwnerAndVisibility() {
  console.info('Add courses.owner_user_id and courses.is_public');

  await client.sql`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  `;

  await client.sql`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
  `;
}

const batch = () => addCourseOwnerAndVisibility();

export default batch;
