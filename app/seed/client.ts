import { db, VercelPoolClient } from '@vercel/postgres';

export const client: VercelPoolClient = await db.connect();
