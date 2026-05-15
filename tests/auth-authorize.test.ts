import { describe, it, expect, vi, beforeEach } from 'vitest';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const mockGetUserForAuth = vi.fn();
const mockIsUserAdmin = vi.fn();
const mockBcryptCompare = vi.fn();

vi.mock('@/app/lib/data', () => ({
  getUserForAuth: (...args: unknown[]) => mockGetUserForAuth(...args),
  isUserAdmin: (...args: unknown[]) => mockIsUserAdmin(...args),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
  },
}));

// Override the global @/auth mock from env.ts to include real authorize + loginSchema
vi.mock('@/auth', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
  };
});

import { authorize, loginSchema } from '@/auth';

const mockUser = {
  id: VALID_UUID,
  name: 'Test User',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  is_admin: false,
};

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
    });
    expect(result.success).toBe(true);
  });

  it('accepts email with optional password omitted', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts email with impersonateByAdminId', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      impersonateByAdminId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID impersonateByAdminId', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      impersonateByAdminId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserForAuth.mockResolvedValue(mockUser);
    mockIsUserAdmin.mockResolvedValue(true);
    mockBcryptCompare.mockResolvedValue(true);
  });

  // ── Schema validation ──────────────────────────────────────────────
  it('returns null for invalid schema (no email)', async () => {
    const result = await authorize({ password: 'secret' });
    expect(result).toBeNull();
  });

  it('returns null for invalid schema (bad email format)', async () => {
    const result = await authorize({ email: 'invalid', password: 'secret' });
    expect(result).toBeNull();
  });

  it('returns null for completely empty credentials', async () => {
    const result = await authorize({});
    expect(result).toBeNull();
  });

  it('returns null for null credentials', async () => {
    const result = await authorize(null);
    expect(result).toBeNull();
  });

  // ── Normal login ──────────────────────────────────────────────────
  it('returns user on valid email + correct password', async () => {
    const result = await authorize({
      email: 'test@example.com',
      password: 'correct-password',
    });
    expect(result).toEqual(mockUser);
    expect(mockGetUserForAuth).toHaveBeenCalledWith('test@example.com');
    expect(mockBcryptCompare).toHaveBeenCalledWith('correct-password', mockUser.password);
  });

  it('returns null when password is missing (no impersonation)', async () => {
    const result = await authorize({ email: 'test@example.com' });
    expect(result).toBeNull();
    expect(mockGetUserForAuth).not.toHaveBeenCalled();
  });

  it('returns null when user is not found', async () => {
    mockGetUserForAuth.mockResolvedValue(null);
    const result = await authorize({
      email: 'unknown@example.com',
      password: 'secret',
    });
    expect(result).toBeNull();
  });

  it('returns null when password does not match', async () => {
    mockBcryptCompare.mockResolvedValue(false);
    const result = await authorize({
      email: 'test@example.com',
      password: 'wrong-password',
    });
    expect(result).toBeNull();
  });

  // ── Impersonation ──────────────────────────────────────────────────
  it('returns user when admin impersonates valid user', async () => {
    const result = await authorize({
      email: 'test@example.com',
      impersonateByAdminId: VALID_UUID,
    });
    expect(result).toEqual(mockUser);
    expect(mockIsUserAdmin).toHaveBeenCalledWith(VALID_UUID);
    expect(mockGetUserForAuth).toHaveBeenCalledWith('test@example.com');
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('returns null when non-admin tries to impersonate', async () => {
    mockIsUserAdmin.mockResolvedValue(false);
    const result = await authorize({
      email: 'test@example.com',
      impersonateByAdminId: VALID_UUID,
    });
    expect(result).toBeNull();
    expect(mockGetUserForAuth).not.toHaveBeenCalled();
  });

  it('returns null when admin impersonates non-existent user', async () => {
    mockGetUserForAuth.mockResolvedValue(null);
    const result = await authorize({
      email: 'nonexistent@example.com',
      impersonateByAdminId: VALID_UUID,
    });
    expect(result).toBeNull();
  });

  it('impersonation takes precedence over password when both provided', async () => {
    const result = await authorize({
      email: 'test@example.com',
      password: 'some-password',
      impersonateByAdminId: VALID_UUID,
    });
    expect(result).toEqual(mockUser);
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });
});
