import { client } from './client';

async function alterMemLevelUserProgressTable() {
  console.info('Alter table user_progress to change memlevel to float');

  try {
    await client.sql`
    ALTER TABLE user_progress
    ALTER COLUMN memlevel TYPE float;
  `;
  } catch (error) {
    console.error('Error in alterMemLevelUserProgressTable: ', error);
    throw error;
  }
}

const batch = () => Promise.all([alterMemLevelUserProgressTable()]);

export default batch;
