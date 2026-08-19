'use client';

import { PowerIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { s } from '@/app/ui/styles';
import ConfirmationDialog from './ConfirmationDialog';
import { useState } from 'react';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

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
  const { t } = useTranslation();
  return (
    <>
      <button
        className={clsx(className, {
          [s.navHover]: isLoggedIn,
        })}
        disabled={!isLoggedIn}
        onClick={() => setIsDialogOpen(true)}
      >
        <PowerIcon className="w-6" />
        <div /*className="hidden md:block"*/>{t('auth.signOut')}</div>
      </button>
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleSignOut}
        title={t('auth.signOut')}
        message={t('auth.signOutConfirm')}
        confirmText={t('auth.signOut')}
        cancelText={t('common.cancel')}
        variant="danger"
      />
    </>
  );
}
