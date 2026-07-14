import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';

const TEST_ENV_FILE = path.join(process.cwd(), '.test-env.json');

if (fs.existsSync(TEST_ENV_FILE)) {
  const env = JSON.parse(fs.readFileSync(TEST_ENV_FILE, 'utf-8'));
  process.env.POSTGRES_URL = env.POSTGRES_URL;
}

// @/app/lib/db defaults to the Neon driver; tests run against a plain
// Testcontainers Postgres, so route it through the same pg.Pool path used
// for self-hosting.
process.env.DB_PROVIDER = 'pg';

// Mock auth for all tests - data layer depends on auth()
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test User',
      email: 'test@example.com',
    },
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock next/cache for server actions (revalidatePath)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next-auth - auth actions import AuthError; next-auth loads next/server which fails in Vitest
vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    type = 'CredentialsSignin';
  },
  default: () => ({
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
