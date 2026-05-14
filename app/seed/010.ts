import { client } from './client';

async function createWordImagesTable() {
  console.info('Create word_images table');

  await client.sql`
    CREATE TABLE IF NOT EXISTS word_images (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      word_id UUID NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_wi_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `;
}

async function createImageRequestsTable() {
  console.info('Create image_requests table');

  await client.sql`
    CREATE TABLE IF NOT EXISTS image_requests (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      word_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      in_progress_since TIMESTAMP,

      CONSTRAINT fk_ir_word FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE,
      CONSTRAINT unique_ir_word UNIQUE (word_id)
    );
  `;
}

const batch = async () => {
  await createWordImagesTable();
  await createImageRequestsTable();
};

export default batch;
