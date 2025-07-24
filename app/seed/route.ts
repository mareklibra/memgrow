import { client } from './client';
import seedData from './seedData';
import batch001 from './001';
import batch002 from './002';
import batch003 from './003';
import batch004 from './004';

export async function GET() {
  try {
    await client.sql`BEGIN`;
    await batch001();
    await batch002();
    await batch003();
    await batch004();
    await seedData();
    await client.sql`COMMIT`;

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
