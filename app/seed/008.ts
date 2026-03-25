import { client } from './client';

async function createUserCourseTable() {
  console.info('Create user_course table');

  await client.sql`
    CREATE TABLE IF NOT EXISTS user_course (
      user_id UUID NOT NULL,
      course_id UUID NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_uc_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_uc_course FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
      CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
    );
  `;
}

const batch = () => Promise.all([createUserCourseTable()]);

export default batch;
