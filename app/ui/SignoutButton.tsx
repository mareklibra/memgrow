'use client';

import { PowerIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ConfirmationDialog from './ConfirmationDialog';
import { useState } from 'react';

export default function SignoutButton({
  isLoggedIn,
  handleSignOut,
  className,
}: {
  isLoggedIn: boolean;
  handleSignOut: () => void;
  className?: string;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <div>
      <button
        className={clsx(className, {
          'hover:bg-sky-100 hover:text-blue-600': isLoggedIn,
        })}
        disabled={!isLoggedIn}
        onClick={() => setIsDialogOpen(true)}
      >
        <PowerIcon className="w-6" />
        <div className="hidden md:block">Sign Out</div>
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
    </div>
  );
}
