import { client } from './client';

async function seedUsers() {
  console.info('Create users table');

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
}

async function seedCourses() {
  console.info('Create courses table');

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
}

async function seedWords() {
  console.info('Create words table');

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
}

async function seedUserProgress() {
  console.info('Create user_progress table');

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
}

const batch = async () => {
  await seedUsers();
  await seedCourses();
  await seedWords();
  await seedUserProgress();
};

export default batch;
