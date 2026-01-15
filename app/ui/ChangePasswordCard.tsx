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
import { changeUserPassword } from '../lib/actions';

export function ChangePasswordCard({ userId }: { userId?: string }) {
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  if (!userId) {
    return <div>No user id</div>;
  }

  const handleChangePassword = async () => {
    setError(undefined);
    setStatus(undefined);
    const result = await changeUserPassword(userId, newPassword);
    if (result?.message) {
      setError(result.message);
    } else {
      setNewPassword('');
      setRetypePassword('');
      setStatus('Done');
    }
  };

  return (
    <Card className="w-96 h-fit" variant="gradient" shadow={true}>
      <CardBody className="flex flex-col gap-4">
        <Typography variant="small" className="font-normal uppercase">
          Change Password
        </Typography>

        <Input
          label="New password"
          value={newPassword}
          size="lg"
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
        />
        <Input
          label="Retype"
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
          disabled={!newPassword || newPassword !== retypePassword}
          onClick={handleChangePassword}
        >
          Change
        </Button>
      </CardFooter>
    </Card>
  );
}
