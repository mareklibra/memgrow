'use client';

import {
  Card,
  CardBody,
  CardFooter,
  Typography,
  Input,
  Button,
} from '@material-tailwind/react';
import { useState } from 'react';
import { addNewUser } from '../lib/actions';

export function AddNewUserCard() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const handleAddNewUser = async () => {
    setError(undefined);
    setStatus(undefined);
    const result = await addNewUser({ name, email, password });
    if (result?.message) {
      setError(result.message);
    } else {
      setPassword('');
      setRetypePassword('');
      setStatus('Done');
    }
  };

  return (
    // @ts-expect-error Material Tailwind React compatibility with React 19
    <Card className="w-96 h-fit" variant="gradient" shadow={true}>
      <CardBody className="flex flex-col gap-4">
        <Typography variant="small" className="font-normal uppercase">
          Add New User
        </Typography>

        <Input
          label="Name"
          value={name}
          size="lg"
          crossOrigin={undefined}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
        />
        <Input
          label="Email (will be used for login)"
          value={email}
          size="lg"
          crossOrigin={undefined}
          onChange={(e) => setEmail(e.target.value)}
          minLength={3}
        />

        <Input
          label="New password"
          value={password}
          size="lg"
          crossOrigin={undefined}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
        />
        <Input
          label="Retype"
          value={retypePassword}
          size="lg"
          error={password !== retypePassword}
          crossOrigin={undefined}
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
          disabled={!name || !email || !password || password !== retypePassword}
          onClick={handleAddNewUser}
        >
          Change
        </Button>
      </CardFooter>
    </Card>
  );
}
