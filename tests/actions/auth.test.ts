import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addNewUser, changeUserPassword } from '@/app/lib/actions/auth';
import { truncateAll } from '../setup/db';
import { createTestUser } from '../fixtures/factories';
import { getUserForAuth } from '@/app/lib/data';

describe('actions/auth', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(async () => {
    await truncateAll();
  });

  describe('addNewUser', () => {
    it('creates a new user with hashed password', async () => {
      const result = await addNewUser({
        name: 'New User',
        email: 'newuser@test.com',
        password: 'secret123',
      });
      expect(result?.message).toBeUndefined();

      const user = await getUserForAuth('newuser@test.com');
      expect(user).toBeDefined();
      expect(user?.name).toBe('New User');
      expect(user?.password).not.toBe('secret123');
      expect(user?.password.startsWith('$2')).toBe(true); // bcrypt hash
    });

    it('returns error on duplicate email', async () => {
      await createTestUser({ email: 'dup@test.com' });
      const result = await addNewUser({
        name: 'Dup',
        email: 'dup@test.com',
        password: 'pass',
      });
      expect(result?.message).toBeDefined();
    });
  });

  describe('changeUserPassword', () => {
    it('updates user password', async () => {
      const user = await createTestUser({
        email: 'changepw@test.com',
        password: 'oldpass',
      });

      const result = await changeUserPassword(user.id, 'newpass');
      expect(result?.message).toBeUndefined();

      const fetched = await getUserForAuth('changepw@test.com');
      expect(fetched).toBeDefined();
      const bcrypt = await import('bcrypt');
      const match = await bcrypt.compare('newpass', fetched!.password);
      expect(match).toBe(true);
    });
  });
});
