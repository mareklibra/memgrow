import { useState } from 'react';
import { TrashIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { DeleteImageResult } from '../lib/types';
import { Typography } from '@/app/lib/material-tailwind-compat';

export type WordPicturesProps = {
  wordId: string;
  queryImages: (
    wordId: string,
  ) => Promise<{ images?: { id: string; createdAt: Date }[]; message?: string }>;
  deleteImage: (imageId: string) => Promise<DeleteImageResult>;
};

export const WordPictures = ({
  wordId,
  queryImages,
  deleteImage,
}: Readonly<WordPicturesProps>) => {
  const [images, setImages] = useState<{ id: string; createdAt: Date }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentIdx, setCurrentIdx] = useState(0);

  const loadImages = async () => {
    if (loaded) return;
    const result = await queryImages(wordId);
    if (result.message) {
      setError(result.message);
      return;
    }
    setImages(result.images ?? []);
    setLoaded(true);
    setCurrentIdx(0);
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (images.length === 0) return;

    const imageToDelete = images[currentIdx];
    const nextImages = images.filter((_, i) => i !== currentIdx);
    setImages(nextImages);

    if (currentIdx >= nextImages.length && nextImages.length > 0) {
      setCurrentIdx(nextImages.length - 1);
    }

    const result = await deleteImage(imageToDelete.id);
    if (result?.message) {
      setError(result.message);
    }
  };

  const prev = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const next = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentIdx < images.length - 1) setCurrentIdx(currentIdx + 1);
  };

  // Trigger load on first render when parent expands
  if (!loaded && !error) {
    loadImages();
  }

  if (error) {
    return <Typography className="text-red-500 text-sm">Error: {error}</Typography>;
  }

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIdx];

  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/image/word/${currentImage.id}`}
        alt="Word illustration"
        className="max-w-full max-h-64 rounded-lg object-contain"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={currentIdx === 0}
          className="p-1 disabled:opacity-30"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <span className="text-sm">
          {currentIdx + 1}/{images.length}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={currentIdx === images.length - 1}
          className="p-1 disabled:opacity-30"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="p-1 text-red-400 hover:text-red-600"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
