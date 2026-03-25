import { Pool } from 'pg';

/**
 * Runs the full schema (equivalent to seed batches 001-008) against a given connection string.
 * Uses pg (not @vercel/postgres) because @vercel/postgres uses Neon's WebSocket driver
 * which doesn't support standard Postgres (e.g. Testcontainers).
 */
export async function runSchema(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });

  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      known_lang VARCHAR(255) NOT NULL,
      learning_lang VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code VARCHAR(8) NOT NULL DEFAULT 'en';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS words (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      course_id UUID NOT NULL,
      word VARCHAR(255) NOT NULL,
      definition TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_course FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id UUID NOT NULL,
      word_id UUID NOT NULL,
      memlevel FLOAT NOT NULL,
      form VARCHAR(16) NOT NULL,
      repeat_again TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE,
      CONSTRAINT unique_user_word UNIQUE (user_id, word_id)
    );
  `);

  await pool.query(`
    ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS is_priority BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sounds (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      word_id UUID NOT NULL,
      audio_source_base64 TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS examples (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      word_id UUID NOT NULL,
      example TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_course (
      user_id UUID NOT NULL,
      course_id UUID NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_uc_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_uc_course FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
      CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
    );
  `);

  await pool.end();
}
