import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addNewUser,
  adminSetUserPassword,
  changeOwnPassword,
  deleteUser,
} from '@/app/lib/actions/auth';
import { auth, signOut } from '@/auth';
import { truncateAll } from '../setup/db';
import { createTestUser } from '../fixtures/factories';
import { getUserForAuth, fetchUserTokenVersion } from '@/app/lib/data';
import { mockAuthUser } from '../setup/auth-mock';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';
import { createTranslator } from '@/app/lib/i18n';

const defaultSession = {
  user: {
    id: mockAuthUser.id,
    name: mockAuthUser.name,
    email: mockAuthUser.email,
  },
};

const t = createTranslator('en');

async function mockSession() {
  vi.mocked(auth).mockResolvedValue(defaultSession as never);
  vi.mocked(signOut).mockClear();
}

describe('actions/auth', () => {
  beforeEach(async () => {
    await truncateAll();
    await mockSession();
  });

  afterEach(async () => {
    await truncateAll();
    await mockSession();
  });

  describe('addNewUser', () => {
    it('rejects non-admin callers', async () => {
      await createTestUser({ is_admin: false });
      const result = await addNewUser({
        name: 'New User',
        email: 'newuser@test.com',
        password: 'secret123',
      });
      expect(result?.message).toBe(t('errors.notAuthorizedAdmin'));
      expect(await getUserForAuth('newuser@test.com')).toBeUndefined();
    });

    it('creates a new user with hashed password when caller is admin', async () => {
      await createTestUser({ is_admin: true });
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
      expect(user?.password.startsWith('$2')).toBe(true);
      expect(user?.is_admin).toBe(false);
    });

    it('stores emails in lowercase', async () => {
      await createTestUser({ is_admin: true });
      const result = await addNewUser({
        name: 'Mixed Case',
        email: 'Admin@Test.com',
        password: 'secret123',
      });
      expect(result?.message).toBeUndefined();

      const user = await getUserForAuth('admin@test.com');
      expect(user?.email).toBe('admin@test.com');
      expect(await getUserForAuth('ADMIN@TEST.COM')).toMatchObject({
        email: 'admin@test.com',
      });
    });

    it('rejects passwords shorter than the minimum', async () => {
      await createTestUser({ is_admin: true });
      const result = await addNewUser({
        name: 'Short',
        email: 'short@test.com',
        password: '12345',
      });
      expect(result?.message).toBe(
        t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH }),
      );
      expect(await getUserForAuth('short@test.com')).toBeUndefined();
    });

    it('rejects empty name', async () => {
      await createTestUser({ is_admin: true });
      const result = await addNewUser({
        name: '   ',
        email: 'emptyname@test.com',
        password: 'secret123',
      });
      expect(result?.message).toBe(t('errors.emptyName'));
      expect(await getUserForAuth('emptyname@test.com')).toBeUndefined();
    });

    it('rejects invalid email', async () => {
      await createTestUser({ is_admin: true });
      const result = await addNewUser({
        name: 'No Email',
        email: 'not-an-email',
        password: 'secret123',
      });
      expect(result?.message).toBe(t('errors.invalidEmail'));
    });

    it('returns error on duplicate email', async () => {
      await createTestUser({ is_admin: true, email: 'dup@test.com' });
      const result = await addNewUser({
        name: 'Dup',
        email: 'dup@test.com',
        password: 'pass123',
      });
      expect(result?.message).toBeDefined();
    });
  });

  describe('changeOwnPassword', () => {
    it('updates the session user password when the current password matches', async () => {
      await createTestUser({ password: 'oldpass1' });

      const result = await changeOwnPassword('oldpass1', 'newpass1');
      expect(result?.message).toBeUndefined();
      expect(signOut).toHaveBeenCalledWith({ redirectTo: '/login' });

      const fetched = await getUserForAuth(mockAuthUser.email);
      expect(fetched).toBeDefined();
      const bcrypt = await import('bcrypt');
      expect(await bcrypt.compare('newpass1', fetched!.password)).toBe(true);
      expect(await fetchUserTokenVersion(mockAuthUser.id)).toBe(1);
    });

    it('rejects an incorrect current password', async () => {
      await createTestUser({ password: 'oldpass1' });

      const result = await changeOwnPassword('wrongpass', 'newpass1');
      expect(result?.message).toBe(t('errors.incorrectCurrentPassword'));
      expect(signOut).not.toHaveBeenCalled();

      const fetched = await getUserForAuth(mockAuthUser.email);
      const bcrypt = await import('bcrypt');
      expect(await bcrypt.compare('oldpass1', fetched!.password)).toBe(true);
    });

    it('rejects a too-short new password', async () => {
      await createTestUser({ password: 'oldpass1' });
      const result = await changeOwnPassword('oldpass1', '12345');
      expect(result?.message).toBe(
        t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH }),
      );
      expect(signOut).not.toHaveBeenCalled();
    });
  });

  describe('adminSetUserPassword', () => {
    it('rejects non-admin callers', async () => {
      await createTestUser({ is_admin: false });
      const other = await createTestUser({
        id: crypto.randomUUID(),
        email: 'other@test.com',
        password: 'oldpass1',
      });
      const result = await adminSetUserPassword(other.id, 'newpass1');
      expect(result?.message).toBe(t('errors.notAuthorizedAdmin'));
    });

    it('sets another user password when caller is admin', async () => {
      await createTestUser({ is_admin: true });
      const other = await createTestUser({
        id: crypto.randomUUID(),
        email: 'other@test.com',
        password: 'oldpass1',
      });

      const result = await adminSetUserPassword(other.id, 'newpass1');
      expect(result?.message).toBeUndefined();

      const fetched = await getUserForAuth('other@test.com');
      const bcrypt = await import('bcrypt');
      expect(await bcrypt.compare('newpass1', fetched!.password)).toBe(true);
      expect(await fetchUserTokenVersion(other.id)).toBe(1);
    });

    it('cannot set the caller own password', async () => {
      await createTestUser({ is_admin: true, password: 'oldpass1' });
      const result = await adminSetUserPassword(mockAuthUser.id, 'newpass1');
      expect(result?.message).toBe(t('errors.cannotSetOwnPassword'));

      const fetched = await getUserForAuth(mockAuthUser.email);
      const bcrypt = await import('bcrypt');
      expect(await bcrypt.compare('oldpass1', fetched!.password)).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('rejects non-admin callers', async () => {
      await createTestUser({ is_admin: false });
      const other = await createTestUser({
        id: crypto.randomUUID(),
        email: 'other@test.com',
      });
      const result = await deleteUser(other.id);
      expect(result?.message).toBe(t('errors.notAuthorizedAdmin'));
      expect(await getUserForAuth('other@test.com')).toBeDefined();
    });

    it('deletes another user', async () => {
      await createTestUser({ is_admin: true });
      const other = await createTestUser({
        id: crypto.randomUUID(),
        email: 'other@test.com',
      });
      const result = await deleteUser(other.id);
      expect(result?.message).toBeUndefined();
      expect(await getUserForAuth('other@test.com')).toBeUndefined();
    });

    it('cannot delete self', async () => {
      await createTestUser({ is_admin: true });
      const result = await deleteUser(mockAuthUser.id);
      expect(result?.message).toBe(t('errors.cannotDeleteSelf'));
      expect(await getUserForAuth(mockAuthUser.email)).toBeDefined();
    });

    it('cannot delete self when another admin exists', async () => {
      await createTestUser({ is_admin: true });
      await createTestUser({
        id: crypto.randomUUID(),
        email: 'other-admin@test.com',
        is_admin: true,
      });
      const result = await deleteUser(mockAuthUser.id);
      expect(result?.message).toBe(t('errors.cannotDeleteSelf'));
      expect(await getUserForAuth(mockAuthUser.email)).toBeDefined();
    });

    it('can delete a non-last admin', async () => {
      await createTestUser({ is_admin: true });
      const otherAdmin = await createTestUser({
        id: crypto.randomUUID(),
        email: 'other-admin@test.com',
        is_admin: true,
      });
      const result = await deleteUser(otherAdmin.id);
      expect(result?.message).toBeUndefined();
      expect(await getUserForAuth('other-admin@test.com')).toBeUndefined();
    });
  });
});
