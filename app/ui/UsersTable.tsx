'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Typography } from '@/app/lib/material-tailwind-compat';
import { adminSetUserPassword, deleteUser, impersonateUser } from '@/app/lib/actions';
import type { UserListItem } from '@/app/lib/definitions';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { localeToBcp47 } from '@/app/lib/i18n';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';
import { formatDateToLocal } from '@/app/lib/utils';
import { s } from '@/app/ui/styles';
import ConfirmationDialog from '@/app/ui/ConfirmationDialog';

type PendingAction =
  | { type: 'delete'; user: UserListItem }
  | { type: 'impersonate'; user: UserListItem }
  | { type: 'password'; user: UserListItem }
  | null;

function createdAtString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function UsersTable({
  users,
  currentUserId,
}: Readonly<{
  users: UserListItem[];
  currentUserId: string;
}>) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const bcp47 = localeToBcp47(locale);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | undefined>();
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const resetPassword = () => {
    setNewPassword('');
    setRetypePassword('');
    setPasswordError(undefined);
  };

  const closePending = () => {
    setPending(null);
    resetPassword();
  };

  const handleDelete = async () => {
    if (pending?.type !== 'delete') return;
    setError(undefined);
    const result = await deleteUser(pending.user.id);
    if (result?.message) {
      setError(result.message);
    } else {
      router.refresh();
    }
  };

  const handleImpersonate = async () => {
    if (pending?.type !== 'impersonate') return;
    setError(undefined);
    const result = await impersonateUser(pending.user.id);
    if (result?.message) {
      setError(result.message);
    }
  };

  const handleSetPassword = async () => {
    if (pending?.type !== 'password') return false;
    setPasswordError(undefined);
    const result = await adminSetUserPassword(pending.user.id, newPassword);
    if (result?.message) {
      setPasswordError(result.message);
      return false;
    }
    resetPassword();
  };

  const passwordReady =
    !!newPassword &&
    newPassword === retypePassword &&
    newPassword.length >= PASSWORD_MIN_LENGTH;

  const actionClass =
    'rounded-md px-2 py-1 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {error && (
        <Typography variant="small" className="font-small" color="red">
          {error}
        </Typography>
      )}
      <table className={s.tableDivider}>
        <thead>
          <tr>
            <th className={s.th}>{t('settings.name')}</th>
            <th className={s.th}>{t('settings.email')}</th>
            <th className={s.th}>{t('settings.admin')}</th>
            <th className={s.th}>{t('settings.created')}</th>
            <th className={s.th}>{t('settings.actions')}</th>
          </tr>
        </thead>
        <tbody className={s.tableDivider}>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id}>
                <td className={s.td}>{user.name}</td>
                <td className={s.td}>{user.email}</td>
                <td className={s.td}>
                  {user.is_admin ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {t('settings.admin')}
                    </span>
                  ) : null}
                </td>
                <td className={s.td}>
                  {formatDateToLocal(createdAtString(user.created_at), bcp47)}
                </td>
                <td className={s.td}>
                  <div className="flex flex-wrap items-center gap-1">
                    {!isSelf && (
                      <button
                        type="button"
                        className={`${actionClass} text-blue-600`}
                        onClick={() => {
                          setError(undefined);
                          resetPassword();
                          setPending({ type: 'password', user });
                        }}
                      >
                        {t('settings.changePassword')}
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        type="button"
                        className={`${actionClass} text-amber-700`}
                        onClick={() => {
                          setError(undefined);
                          setPending({ type: 'impersonate', user });
                        }}
                      >
                        {t('settings.impersonate')}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${actionClass} text-red-600`}
                      disabled={isSelf}
                      title={isSelf ? t('settings.cannotDeleteSelfTitle') : undefined}
                      onClick={() => {
                        if (isSelf) return;
                        setError(undefined);
                        setPending({ type: 'delete', user });
                      }}
                    >
                      {t('settings.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmationDialog
        isOpen={pending?.type === 'delete'}
        onClose={() => setPending(null)}
        onConfirm={handleDelete}
        title={t('settings.deleteUser')}
        message={
          pending?.type === 'delete'
            ? t('settings.deleteUserConfirm', {
                name: pending.user.name,
                email: pending.user.email,
              })
            : ''
        }
        confirmText={t('settings.delete')}
        variant="danger"
      />

      <ConfirmationDialog
        isOpen={pending?.type === 'impersonate'}
        onClose={() => setPending(null)}
        onConfirm={handleImpersonate}
        title={t('settings.impersonate')}
        message={
          pending?.type === 'impersonate'
            ? t('settings.impersonateConfirm', {
                name: pending.user.name,
                email: pending.user.email,
              })
            : ''
        }
        confirmText={t('settings.impersonate')}
        variant="warning"
      />

      <ConfirmationDialog
        isOpen={pending?.type === 'password'}
        onClose={closePending}
        onConfirm={handleSetPassword}
        title={
          pending?.type === 'password'
            ? t('settings.changePasswordFor', { name: pending.user.name })
            : t('settings.changePassword')
        }
        confirmText={t('settings.change')}
        confirmDisabled={!passwordReady}
      >
        <div className="flex flex-col gap-4">
          <Input
            type="password"
            label={t('settings.newPassword')}
            value={newPassword}
            size="lg"
            autoFocus
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
          />
          <Input
            type="password"
            label={t('settings.retype')}
            value={retypePassword}
            size="lg"
            error={newPassword !== retypePassword}
            onChange={(e) => setRetypePassword(e.target.value)}
          />
          {passwordError && (
            <Typography variant="small" className="font-small" color="red">
              {passwordError}
            </Typography>
          )}
        </div>
      </ConfirmationDialog>
    </div>
  );
}
