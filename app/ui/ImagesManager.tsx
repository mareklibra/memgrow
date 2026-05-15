'use client';

import { useMemo, useState } from 'react';
import { Course } from '@/app/lib/definitions';
import { WordImageSummary, RequestImageResult } from '@/app/lib/types';
import { Spinner } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import {
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PhotoIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { DeleteImageResult } from '@/app/lib/types';

type ImagesManagerProps = {
  courses: Course[];
  fetchSummaries: (courseId: string) => Promise<WordImageSummary[]>;
  requestGeneration: (wordId: string) => Promise<RequestImageResult>;
  removeRequest: (wordId: string) => Promise<void>;
  queryImages: (
    wordId: string,
  ) => Promise<{ images?: { id: string; createdAt: Date }[]; message?: string }>;
  deleteImage: (imageId: string) => Promise<DeleteImageResult>;
};

export function ImagesManager({
  courses,
  fetchSummaries,
  requestGeneration,
  removeRequest,
  queryImages,
  deleteImage,
}: Readonly<ImagesManagerProps>) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [summaries, setSummaries] = useState<WordImageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowInProgress, setRowInProgress] = useState<Record<string, boolean>>({});

  type SortKey = 'word' | 'definition' | 'requested' | 'imageCount';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('word');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [galleryWordId, setGalleryWordId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<{ id: string; createdAt: Date }[]>(
    [],
  );
  const [galleryLoading, setGalleryLoading] = useState(false);

  const sortedSummaries = useMemo(() => {
    const sorted = [...summaries].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case 'word':
          cmp = a.word.localeCompare(b.word);
          break;
        case 'definition':
          cmp = a.definition.localeCompare(b.definition);
          break;
        case 'requested':
          cmp = Number(a.requested) - Number(b.requested);
          break;
        case 'imageCount':
          cmp = a.imageCount - b.imageCount;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [summaries, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? (
      <ChevronUpIcon className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDownIcon className="w-3 h-3 inline ml-1" />
    );
  };

  const loadSummaries = async (courseId: string) => {
    if (!courseId) {
      setSummaries([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchSummaries(courseId);
      setSummaries(data);
    } catch (e) {
      console.error('Failed to fetch summaries:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setRowErrors({});
    setRowInProgress({});
    await loadSummaries(courseId);
  };

  const handleGenerate = async (wordId: string) => {
    setRowErrors((prev) => ({ ...prev, [wordId]: '' }));
    setRowInProgress((prev) => ({ ...prev, [wordId]: true }));

    try {
      const reqResult = await requestGeneration(wordId);
      if (reqResult.message) {
        setRowErrors((prev) => ({ ...prev, [wordId]: reqResult.message! }));
        return;
      }

      setSummaries((prev) =>
        prev.map((s) =>
          s.wordId === wordId ? { ...s, requested: true, inProgress: true } : s,
        ),
      );

      const res = await fetch(`/api/image/generate/${wordId}`, { method: 'POST' });
      const genResult: { message?: string; imageId?: string } = await res.json();
      if (!res.ok || genResult.message) {
        setRowErrors((prev) => ({
          ...prev,
          [wordId]: genResult.message ?? 'Image generation failed',
        }));
      } else {
        setSummaries((prev) =>
          prev.map((s) =>
            s.wordId === wordId
              ? {
                  ...s,
                  requested: false,
                  inProgress: false,
                  imageCount: s.imageCount + 1,
                }
              : s,
          ),
        );
      }
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [wordId]: `Generation failed: ${e}`,
      }));
    } finally {
      setRowInProgress((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  const handleRemoveRequest = async (wordId: string) => {
    await removeRequest(wordId);
    setSummaries((prev) =>
      prev.map((s) =>
        s.wordId === wordId ? { ...s, requested: false, inProgress: false } : s,
      ),
    );
  };

  const openGallery = async (wordId: string) => {
    setGalleryWordId(wordId);
    setGalleryLoading(true);
    const result = await queryImages(wordId);
    setGalleryImages(result.images ?? []);
    setGalleryLoading(false);
  };

  const closeGallery = () => {
    setGalleryWordId(null);
    setGalleryImages([]);
  };

  const handleDeleteImage = async (imageId: string) => {
    const result = await deleteImage(imageId);
    if (result?.message) return;

    setGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
    setSummaries((prev) =>
      prev.map((item) =>
        item.wordId === galleryWordId
          ? { ...item, imageCount: Math.max(0, item.imageCount - 1) }
          : item,
      ),
    );
  };

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="course-select" className={s.label}>
          Course
        </label>
        <div className="flex items-center gap-2 max-w-md">
          <select
            id="course-select"
            value={selectedCourseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className={`${s.input} flex-1`}
          >
            <option value="">-- Select a course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadSummaries(selectedCourseId)}
            disabled={!selectedCourseId || loading}
            className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && (
        <div className={s.centered}>
          <Spinner />
        </div>
      )}

      {!loading && selectedCourseId && summaries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('word')}
                >
                  Word
                  <SortIcon column="word" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('definition')}
                >
                  Translation
                  <SortIcon column="definition" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('requested')}
                >
                  Requested
                  <SortIcon column="requested" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('imageCount')}
                >
                  Images
                  <SortIcon column="imageCount" />
                </th>
                <th className={s.th}>Action</th>
              </tr>
            </thead>
            <tbody className={s.tableDivider}>
              {sortedSummaries.map((item) => (
                <tr key={item.wordId}>
                  <td className={s.td}>{item.word}</td>
                  <td className={s.td}>{item.definition}</td>
                  <td className={s.td}>
                    {item.requested && (
                      <CheckCircleIcon
                        className="w-5 h-5 text-green-500 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveRequest(item.wordId)}
                      />
                    )}
                  </td>
                  <td className={s.td}>
                    {item.imageCount > 0 && (
                      <button
                        type="button"
                        onClick={() => openGallery(item.wordId)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <PhotoIcon className="w-4 h-4" />
                        {item.imageCount}
                      </button>
                    )}
                  </td>
                  <td className={s.td}>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleGenerate(item.wordId)}
                        disabled={rowInProgress[item.wordId] || item.inProgress}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rowInProgress[item.wordId] || item.inProgress ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <PhotoIcon className="w-4 h-4" />
                        )}
                        Generate
                      </button>
                      {rowErrors[item.wordId] && (
                        <span className="text-xs text-red-500">
                          {rowErrors[item.wordId]}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && selectedCourseId && summaries.length === 0 && (
        <p className="text-sm text-gray-500">No words found for this course.</p>
      )}

      {galleryWordId && (
        <div className={s.dialogOverlay}>
          <div className={s.dialogBackdrop} onClick={closeGallery} />
          <div className={`${s.dialogPanel} max-w-2xl`} role="dialog" aria-modal="true">
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button type="button" className={s.dialogCloseBtn} onClick={closeGallery}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <h3 className={s.dialogTitle}>
              Images for &ldquo;{summaries.find((i) => i.wordId === galleryWordId)?.word}
              &rdquo;
            </h3>

            {galleryLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}

            {!galleryLoading && galleryImages.length === 0 && (
              <p className="text-sm text-gray-500 mt-4">No images.</p>
            )}

            {!galleryLoading && galleryImages.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4 max-h-96 overflow-y-auto">
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/image/word/${img.id}`}
                      alt="Word illustration"
                      className="w-full rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button type="button" className={s.dialogCancelBtn} onClick={closeGallery}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
