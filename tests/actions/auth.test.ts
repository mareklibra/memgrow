import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import {
  addNewUser,
  adminSetUserPassword,
  changeOwnPassword,
  deleteUser,
  registerUser,
} from '@/app/lib/actions/auth';
import { auth, signIn, signOut } from '@/auth';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@/app/lib/i18n';
import { sql } from '@/app/lib/db';
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

  describe('registerUser', () => {
    function registrationForm(overrides?: Partial<Record<string, string>>) {
      const fields: Record<string, string> = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'secret123',
        confirm: 'secret123',
        locale: 'cs',
        ...overrides,
      };
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
      }
      return formData;
    }

    beforeEach(() => {
      vi.mocked(signIn).mockReset();
      vi.mocked(signIn).mockResolvedValue(undefined as never);
    });

    it('creates a non-admin user and signs them in without a session', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await registerUser(
        undefined,
        registrationForm({
          name: '  New User  ',
          email: 'NewUser@Example.com',
        }),
      );
      expect(result).toBeUndefined();

      const user = await getUserForAuth('newuser@example.com');
      expect(user).toBeDefined();
      expect(user?.name).toBe('New User');
      expect(user?.email).toBe('newuser@example.com');
      expect(user?.is_admin).toBe(false);
      expect(user?.locale).toBe('cs');
      expect(user?.password).not.toBe('secret123');
      expect(user?.password.startsWith('$2')).toBe(true);

      const store = await cookies();
      expect(store.set).toHaveBeenCalledWith(LOCALE_COOKIE, 'cs', {
        path: '/',
        sameSite: 'lax',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        httpOnly: true,
      });
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'newuser@example.com',
        password: 'secret123',
        redirectTo: '/',
      });
    });

    it('lets a redirect from signIn propagate', async () => {
      const redirectError = new Error('NEXT_REDIRECT');
      vi.mocked(signIn).mockRejectedValue(redirectError);

      await expect(registerUser(undefined, registrationForm())).rejects.toBe(
        redirectError,
      );
      expect(await getUserForAuth('newuser@test.com')).toBeDefined();
    });

    it('rejects an empty name', async () => {
      const result = await registerUser(undefined, registrationForm({ name: '   ' }));
      expect(result).toBe(t('errors.emptyName'));
      expect(await getUserForAuth('newuser@test.com')).toBeUndefined();
      expect(signIn).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
      const result = await registerUser(
        undefined,
        registrationForm({ email: 'not-an-email' }),
      );
      expect(result).toBe(t('errors.invalidEmail'));
      expect(signIn).not.toHaveBeenCalled();
    });

    it('rejects a short password', async () => {
      const result = await registerUser(
        undefined,
        registrationForm({ password: '12345', confirm: '12345' }),
      );
      expect(result).toBe(t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH }));
      expect(await getUserForAuth('newuser@test.com')).toBeUndefined();
    });

    it('rejects a password mismatch', async () => {
      const result = await registerUser(
        undefined,
        registrationForm({ confirm: 'different' }),
      );
      expect(result).toBe(t('errors.passwordMismatch'));
      expect(await getUserForAuth('newuser@test.com')).toBeUndefined();
    });

    it('rejects an invalid locale', async () => {
      const result = await registerUser(undefined, registrationForm({ locale: 'de' }));
      expect(result).toBe(t('errors.invalidLocale'));
      expect(await getUserForAuth('newuser@test.com')).toBeUndefined();
    });

    it('returns a specific message when the email is already registered', async () => {
      await createTestUser({ email: 'dup@test.com' });
      const result = await registerUser(
        undefined,
        registrationForm({ email: 'dup@test.com' }),
      );
      expect(result).toBe(t('auth.emailAlreadyRegistered'));
      const count = await sql<{ count: string }>`
        SELECT count(*)::text AS count FROM users WHERE lower(email) = 'dup@test.com'
      `;
      expect(count.rows[0]?.count).toBe('1');
      expect(signIn).not.toHaveBeenCalled();
    });
  });
});
