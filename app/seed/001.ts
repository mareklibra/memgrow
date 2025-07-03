import { client } from './client';
import bcrypt from 'bcrypt';
import { courses, userProgresses, users, words } from '../lib/seed-data';

async function seedUsers() {
  console.info('Seeding users');

  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

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

  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        known_lang VARCHAR(255) NOT NULL,
        learning_lang VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

  const insertedCourses = await Promise.all(
    courses.map(async (course) => {
      return client.sql`
          INSERT INTO courses (id, name, known_lang, learning_lang)
          VALUES (${course.id}, ${course.name}, ${course.knownLang}, ${course.learningLang})
          ON CONFLICT (id) DO NOTHING;
        `;
    }),
  );

  return insertedCourses;
}

async function seedWords() {
  console.info('Seeding words');

  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
      CREATE TABLE IF NOT EXISTS words (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        course_id UUID NOT NULL,
        word VARCHAR(255) NOT NULL,
        definition TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_course FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `;

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

  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        user_id UUID NOT NULL,
        word_id UUID NOT NULL,
  
        memlevel INT NOT NULL,
        form VARCHAR(16) NOT NULL,
        repeat_again TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE,
        CONSTRAINT unique_user_word UNIQUE (user_id, word_id)
      );
    `;

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

const batch = () =>
  Promise.all([seedUsers(), seedCourses(), seedWords(), seedUserProgress()]);

export default batch;
