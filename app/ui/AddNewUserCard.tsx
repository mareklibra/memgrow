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
import { useRouter } from 'next/navigation';
import { addNewUser } from '../lib/actions';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { PASSWORD_MIN_LENGTH } from '@/app/constants';

export function AddNewUserCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleAddNewUser = async () => {
    if (submitting) return;
    setError(undefined);
    setStatus(undefined);
    setSubmitting(true);
    try {
      const result = await addNewUser({ name, email, password });
      if (result?.message) {
        setError(result.message);
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setRetypePassword('');
        setStatus(t('common.done'));
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-96 h-fit" variant="gradient" shadow={true}>
      <CardBody className="flex flex-col gap-4">
        <Typography variant="small" className="font-normal uppercase">
          {t('settings.addNewUser')}
        </Typography>

        <Input
          label={t('settings.name')}
          value={name}
          size="lg"
          onChange={(e) => setName(e.target.value)}
          minLength={2}
        />
        <Input
          label={t('settings.emailForLogin')}
          value={email}
          size="lg"
          onChange={(e) => setEmail(e.target.value)}
          minLength={3}
        />

        <Input
          type="password"
          label={t('settings.newPassword')}
          value={password}
          size="lg"
          onChange={(e) => setPassword(e.target.value)}
          minLength={PASSWORD_MIN_LENGTH}
        />
        <Input
          type="password"
          label={t('settings.retype')}
          value={retypePassword}
          size="lg"
          error={password !== retypePassword}
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
            submitting ||
            !name ||
            !email ||
            !password ||
            password !== retypePassword ||
            password.length < PASSWORD_MIN_LENGTH
          }
          onClick={handleAddNewUser}
        >
          {t('common.create')}
        </Button>
      </CardFooter>
    </Card>
  );
}
