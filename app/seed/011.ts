import { client } from './client';

async function migrateWordImagesToBytea() {
  console.info('Migrate word_images.content from TEXT (base64) to BYTEA');

  const check = await client.sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'word_images' AND column_name = 'content'
  `;

  if (check.rows.length > 0 && check.rows[0].data_type === 'text') {
    await client.sql`
      ALTER TABLE word_images
      ALTER COLUMN content TYPE BYTEA
      USING decode(content, 'base64');
    `;
  } else {
    console.info('word_images.content is already BYTEA, skipping');
  }
}

const batch = async () => {
  await migrateWordImagesToBytea();
};

export default batch;
