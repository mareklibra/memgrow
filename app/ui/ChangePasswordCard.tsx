'use client';

import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Input,
  Button,
} from '@/app/lib/material-tailwind-compat';
import { useState } from 'react';
import { changeOwnPassword } from '../lib/actions';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';

export function ChangePasswordCard() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const handleChangePassword = async () => {
    setError(undefined);
    setStatus(undefined);
    const result = await changeOwnPassword(currentPassword, newPassword);
    if (result?.message) {
      setError(result.message);
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setRetypePassword('');
      setStatus(t('common.done'));
    }
  };

  return (
    <Card className="w-96 h-fit" variant="gradient" shadow={true}>
      <CardBody className="flex flex-col gap-4">
        <Typography variant="small" className="font-normal uppercase">
          {t('settings.changePassword')}
        </Typography>

        <Input
          type="password"
          label={t('settings.currentPassword')}
          value={currentPassword}
          size="lg"
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          type="password"
          label={t('settings.newPassword')}
          value={newPassword}
          size="lg"
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

        {error && (
          <Typography variant="small" className="font-small" color="red">
            {error}
          </Typography>
        )}
        {status && (
          <Typography variant="small" className="font-small" color="green">
            {status}
          </Typography>
        )}
      </CardBody>

      <CardFooter className="pt-0">
        <Button
          variant="gradient"
          fullWidth
          disabled={
            !currentPassword ||
            !newPassword ||
            newPassword !== retypePassword ||
            newPassword.length < PASSWORD_MIN_LENGTH
          }
          onClick={handleChangePassword}
        >
          {t('settings.change')}
        </Button>
      </CardFooter>
    </Card>
  );
}
