#!/usr/bin/env -S pnpm tsx
/**
 * Fresh-install seeding, run from a host shell with access to the target
 * database's connection string - works against both a self-hosted Postgres
 * and a hosted Neon database (see README's "Initial Database Setup").
 *
 * There is intentionally no HTTP endpoint for this: an unauthenticated
 * bootstrap endpoint that creates users would be a real attack surface, and
 * an authenticated one can't bootstrap a brand-new, user-less database
 * anyway (see proxy.ts + auth.config.ts's `authorized()` callback, which
 * blocks all unauthenticated requests except `/`). This script runs the
 * same schema-creation logic directly, then prompts for a real admin
 * account if none exists yet.
 *
 * Usage:
 *   pnpm db:seed                  Create schema, then prompt for an admin
 *                                 account if none exists. If an admin already
 *                                 exists, creation is optional (default: skip).
 *   pnpm db:seed --with-demo-data Create schema + hardcoded demo data (local
 *                                 dev/testing only).
 */
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

async function promptLines(prompts: string[]): Promise<string[]> {
  // Uses the classic (non-promises) readline API: calling rl.question()
  // repeatedly via readline/promises loses subsequent answers when stdin is
  // a pipe (the process's event loop can drain and exit before the next
  // question resolves). Prompting off the 'line' event is reliable for both
  // piped and interactive stdin.
  const readline = await import('node:readline');
  const { stdin, stdout } = await import('node:process');
  return new Promise<string[]>((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const collected: string[] = [];
    rl.setPrompt(prompts[0]);
    rl.prompt();
    rl.on('line', (line) => {
      collected.push(line.trim());
      if (collected.length < prompts.length) {
        rl.setPrompt(prompts[collected.length]);
        rl.prompt();
      } else {
        rl.close();
      }
    });
    rl.on('close', () => {
      // rl.close() pauses stdin; resume so a later prompt (e.g. credentials
      // after the yes/no confirm) can still read remaining piped input.
      if (stdin.isPaused()) {
        stdin.resume();
      }
      resolve(collected);
    });
  });
}

async function promptAdminUser(): Promise<{
  name: string;
  email: string;
  password: string;
}> {
  const prompts = ['Admin name: ', 'Admin email: ', 'Admin password: '];
  const answers = await promptLines(prompts);
  if (answers.length < prompts.length || answers.some((a) => !a)) {
    throw new Error('Name, email, and password are all required.');
  }
  const [name, email, password] = answers;
  return { name, email, password };
}

async function confirmCreateAnotherAdmin(): Promise<boolean> {
  const [answer] = await promptLines([
    'An admin account already exists. Create another? [y/N] ',
  ]);
  const normalized = (answer ?? '').toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      'POSTGRES_URL is not set. Copy .env.example to .env and configure it first.',
    );
  }

  // Imported after dotenv.config() so client.ts sees POSTGRES_URL/DB_PROVIDER
  // from .env at module-load time (it connects at the top level).
  const { client } = await import('../app/seed/client');
  const { createSchema, seedDemoData } = await import('../app/seed/run');
  const bcrypt = (await import('bcrypt')).default;

  const withDemoData = process.argv.includes('--with-demo-data');

  console.info('Creating schema...');
  await client.sql`BEGIN`;
  try {
    await createSchema();

    if (withDemoData) {
      console.info(
        'Seeding demo data (local dev/testing only - do not use on a public deployment)...',
      );
      await seedDemoData();
    }

    await client.sql`COMMIT`;
  } catch (error) {
    await client.sql`ROLLBACK`;
    throw error;
  }
  console.info('Schema ready.');

  if (withDemoData) {
    console.info('Done.');
    return;
  }

  const existingAdmin = await client.sql`
    SELECT 1 FROM users WHERE is_admin = TRUE LIMIT 1
  `;
  if (existingAdmin.rows.length > 0) {
    const createAnother = await confirmCreateAnotherAdmin();
    if (!createAnother) {
      console.info('Skipping admin creation.');
      return;
    }
  }

  console.info('Create your admin account:');
  const admin = await promptAdminUser();
  const hashedPassword = await bcrypt.hash(admin.password, 10);
  await client.sql`
    INSERT INTO users (name, email, password, is_admin)
    VALUES (${admin.name}, ${admin.email}, ${hashedPassword}, TRUE)
  `;
  console.info(`Admin user "${admin.email}" created. You can now log in.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
