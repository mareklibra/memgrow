import { vi } from 'vitest';

export const mockAuthUser = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Test User',
  email: 'test@example.com',
};

// Must be at module level for vi.mock to be hoisted
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: mockAuthUser }),
}));
