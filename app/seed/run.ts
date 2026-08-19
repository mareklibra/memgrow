import batch001 from './001';
import batch002 from './002';
import batch003 from './003';
import batch004 from './004';
import batch005 from './005';
import batch006 from './006';
import batch007 from './007';
import batch008 from './008';
import batch009 from './009';
import batch010 from './010';
import batch011 from './011';
import batch012 from './012';
import batch013 from './013';
import seedDataBatch from './seedData';

/**
 * Creates/updates the full schema. Idempotent (CREATE TABLE IF NOT EXISTS /
 * ADD COLUMN IF NOT EXISTS throughout), safe to run on every fresh install
 * and every subsequent deploy. Used by scripts/db.seed.ts - there is no HTTP
 * endpoint for this (see that script's comment for why).
 */
export async function createSchema(): Promise<void> {
  await batch001();
  await batch002();
  await batch003();
  await batch004();
  await batch005();
  await batch006();
  await batch007();
  await batch008();
  await batch009();
  await batch010();
  await batch011();
  await batch012();
  await batch013();
}

/**
 * Inserts the hardcoded demo user/courses/words/progress from
 * app/lib/seed-data.ts. Intended for local development and testing only —
 * never run this on a self-hosted deployment (use scripts/db.seed.ts's
 * interactive admin-account prompt instead).
 */
export async function seedDemoData(): Promise<void> {
  await seedDataBatch();
}
