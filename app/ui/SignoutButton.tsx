'use client';

import { PowerIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ConfirmationDialog from './ConfirmationDialog';
import { useState } from 'react';

export default function SignoutButton({
  isLoggedIn,
  handleSignOut,
  userName,
}: {
  isLoggedIn: boolean;
  handleSignOut: () => void;
  userName?: string | null;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <>
      <button
        className={clsx(
          'flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium md:flex-none md:justify-start md:p-2 md:px-3',
          {
            'hover:bg-sky-100 hover:text-blue-600': isLoggedIn,
          },
        )}
        disabled={!isLoggedIn}
        onClick={() => setIsDialogOpen(true)}
      >
        <PowerIcon className="w-6" />
        <div className="hidden md:block">Sign Out {userName}</div>
      </button>
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
