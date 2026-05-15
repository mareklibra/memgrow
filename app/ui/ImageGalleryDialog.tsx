'use client';

import { Spinner } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

type ImageGalleryDialogProps = {
  word: string | undefined;
  images: { id: string; createdAt: Date }[];
  loading: boolean;
  onDelete: (imageId: string) => void;
  onClose: () => void;
};

export function ImageGalleryDialog({
  word,
  images,
  loading,
  onDelete,
  onClose,
}: Readonly<ImageGalleryDialogProps>) {
  return (
    <div className={s.dialogOverlay}>
      <div className={s.dialogBackdrop} onClick={onClose} />
      <div className={`${s.dialogPanel} max-w-2xl`} role="dialog" aria-modal="true">
        <div className="absolute right-0 top-0 pr-4 pt-4">
          <button type="button" className={s.dialogCloseBtn} onClick={onClose}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <h3 className={s.dialogTitle}>
          Images for &ldquo;{word}&rdquo;
        </h3>

        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {!loading && images.length === 0 && (
          <p className="text-sm text-gray-500 mt-4">No images.</p>
        )}

        {!loading && images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-4 max-h-96 overflow-y-auto">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/image/word/${img.id}`}
                  alt="Word illustration"
                  className="w-full rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => onDelete(img.id)}
                  className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" className={s.dialogCancelBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
