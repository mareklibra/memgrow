'use client';

import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Button,
} from '@/app/lib/material-tailwind-compat';
import { useState } from 'react';
import { impersonateUser } from '../lib/actions';
import type { UserListItem } from '../lib/data';

export function ImpersonateCard({ users }: { users: UserListItem[] }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleImpersonate = async () => {
    if (!selectedUserId) return;
    setError(undefined);
    const result = await impersonateUser(selectedUserId);
    if (result?.message) {
      setError(result.message);
    }
  };

  return (
    <Card className="w-96 h-fit" variant="gradient" shadow={true}>
      <CardBody className="flex flex-col gap-4">
        <Typography variant="small" className="font-normal uppercase">
          Impersonate User
        </Typography>

        <select
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Select a user...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>

        {error && (
          <Typography variant="small" className="font-small" color="red">
            {error}
          </Typography>
        )}
      </CardBody>

      <CardFooter className="pt-0">
        <Button
          variant="gradient"
          fullWidth
          disabled={!selectedUserId}
          onClick={handleImpersonate}
        >
          Impersonate
        </Button>
      </CardFooter>
    </Card>
  );
}
