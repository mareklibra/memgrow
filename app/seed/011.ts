import { client } from './client';

async function migrateWordImagesToBytea() {
  console.info('Migrate word_images.content from TEXT (base64) to BYTEA');

  await client.sql`
    ALTER TABLE word_images
    ALTER COLUMN content TYPE BYTEA
    USING decode(content, 'base64');
  `;
}

const batch = async () => {
  await migrateWordImagesToBytea();
};

export default batch;
