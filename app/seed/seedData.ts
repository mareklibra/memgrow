import { client } from './client';
import bcrypt from 'bcrypt';
import { courses, userProgresses, users, words } from '../lib/seed-data';

async function seedUsers() {
  console.info('Seeding users');

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return client.sql`
            INSERT INTO users (id, name, email, password)
            VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
            ON CONFLICT (id) DO NOTHING;
          `;
    }),
  );

  return insertedUsers;
}

async function seedCourses() {
  console.info('Seeding courses');

  const insertedCourses = await Promise.all(
    courses.map(async (course) => {
      return client.sql`
            INSERT INTO courses (id, name, known_lang, learning_lang, course_code)
            VALUES (${course.id}, ${course.name}, ${course.knownLang}, ${course.learningLang}, ${course.courseCode})
            ON CONFLICT (id) DO NOTHING;
          `;
    }),
  );

  return insertedCourses;
}

async function seedWords() {
  console.info('Seeding words');

  const insertedWords = await Promise.all(
    words.map(async (word) => {
      return client.sql`
            INSERT INTO words (id, course_id, word, definition)
            VALUES (${word.id}, ${word.course_id}, ${word.word}, ${word.definition})
            ON CONFLICT (id) DO NOTHING;
          `;
    }),
  );

  return insertedWords;
}

async function seedUserProgress() {
  console.info('Seeding userProgress');

  const insertedUserProgress = await Promise.all(
    userProgresses.map(async (userProgress) => {
      return client.sql`
            INSERT INTO user_progress (user_id, word_id, memlevel, form)
            VALUES (${userProgress.userId}, ${userProgress.wordId}, ${userProgress.memLevel}, ${userProgress.form})
            ON CONFLICT (user_id, word_id) DO NOTHING;
          `;
    }),
  );

  return insertedUserProgress;
}

const batch = async () => {
  await seedUsers();
  await seedCourses();
  await seedWords();
  await seedUserProgress();
};

export default batch;
