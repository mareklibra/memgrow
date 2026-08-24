'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { s } from '@/app/ui/styles';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'info',
  children,
  confirmDisabled = false,
}: ConfirmationDialogProps) {
  const { t } = useTranslation();
  const resolvedConfirm = confirmText ?? t('common.confirm');
  const resolvedCancel = cancelText ?? t('common.cancel');
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [processing, setProcessing] = useState(false);

  const close = useCallback(() => {
    if (!processing) onClose();
  }, [processing, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        close();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';

      if (!children) {
        setTimeout(() => {
          confirmButtonRef.current?.focus();
        }, 100);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, close, children]);

  useEffect(() => {
    if (!isOpen) setProcessing(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (processing || confirmDisabled) return;
    setProcessing(true);
    try {
      const result = await onConfirm();
      if (result === false) return;
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!processing) {
      onClose();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: '🛑',
          confirmButton: 'bg-red-600 hover:bg-red-500 focus:ring-red-500',
          iconColor: 'text-red-600',
        };
      case 'warning':
        return {
          icon: '⚠️',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-500 focus:ring-yellow-500',
          iconColor: 'text-yellow-600',
        };
      case 'info':
      default:
        return {
          icon: 'ℹ️',
          confirmButton: 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500',
          iconColor: 'text-blue-600',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const describedBy = message ? 'dialog-description' : undefined;

  return (
    <div className={s.dialogOverlay}>
      <div className={s.dialogBackdrop} />

      <div
        ref={dialogRef}
        className={s.dialogPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={describedBy}
      >
        <div className="absolute right-0 top-0 pr-4 pt-4">
          <button
            type="button"
            className={s.dialogCloseBtn}
            onClick={handleCancel}
            disabled={processing}
          >
            <span className="sr-only">{t('common.close')}</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 sm:mx-0 sm:h-10 sm:w-10">
            <span className="text-2xl" aria-hidden="true">
              {variantStyles.icon}
            </span>
          </div>

          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left grow">
            <h3 className={s.dialogTitle} id="dialog-title">
              {title}
            </h3>
            {message ? (
              <div className="mt-2">
                <p className={s.dialogDescription} id="dialog-description">
                  {message}
                </p>
              </div>
            ) : null}
            {children ? <div className="mt-4">{children}</div> : null}
          </div>
        </div>

        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            ref={confirmButtonRef}
            type="button"
            className={clsx(s.dialogConfirmBtn, variantStyles.confirmButton, {
              [s.disabledState]: processing || confirmDisabled,
            })}
            onClick={handleConfirm}
            disabled={processing || confirmDisabled}
          >
            {processing ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {t('common.loading')}
              </div>
            ) : (
              resolvedConfirm
            )}
          </button>
          <button
            type="button"
            className={clsx(s.dialogCancelBtn, {
              [s.disabledState]: processing,
            })}
            onClick={handleCancel}
            disabled={processing}
          >
            {resolvedCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
