'use client';

import { useMemo, useRef, useState } from 'react';
import { Course } from '@/app/lib/definitions';
import {
  WordMediaSummary,
  RequestImageResult,
  DeleteImageResult,
  DeleteSoundResult,
} from '@/app/lib/types';
import { Spinner } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import {
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ImageGalleryDialog } from '@/app/ui/ImageGalleryDialog';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { localeToBcp47 } from '@/app/lib/i18n';

type MediaManagerProps = {
  courses: Course[];
  fetchSummaries: (courseId: string) => Promise<WordMediaSummary[]>;
  requestImageGeneration: (wordId: string) => Promise<RequestImageResult>;
  removeImageRequest: (wordId: string) => Promise<void>;
  queryImages: (wordId: string) => Promise<{
    images?: { id: string; createdAt: Date; sizeKb: number }[];
    message?: string;
  }>;
  deleteImage: (imageId: string) => Promise<DeleteImageResult>;
  deleteAllImages: (wordId: string) => Promise<DeleteImageResult>;
  deleteSound: (wordId: string) => Promise<DeleteSoundResult>;
};

export function MediaManager({
  courses,
  fetchSummaries,
  requestImageGeneration,
  removeImageRequest,
  queryImages,
  deleteImage,
  deleteAllImages,
  deleteSound,
}: Readonly<MediaManagerProps>) {
  const { t, locale } = useTranslation();
  const bcp47 = localeToBcp47(locale);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [summaries, setSummaries] = useState<WordMediaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowInProgress, setRowInProgress] = useState<Record<string, boolean>>({});

  type SortKey =
    | 'word'
    | 'definition'
    | 'imageRequested'
    | 'imageCount'
    | 'totalImageSizeKb'
    | 'hasSound'
    | 'soundSizeKb';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('imageRequested');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [galleryWordId, setGalleryWordId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<
    { id: string; createdAt: Date; sizeKb: number }[]
  >([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const [playingWordId, setPlayingWordId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalImageSizeKb = useMemo(
    () => summaries.reduce((sum, s) => sum + s.totalImageSizeKb, 0),
    [summaries],
  );
  const totalSoundSizeKb = useMemo(
    () => summaries.reduce((sum, s) => sum + s.soundSizeKb, 0),
    [summaries],
  );

  const sortedSummaries = useMemo(() => {
    const sorted = [...summaries].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case 'word':
          cmp = a.word.localeCompare(b.word, bcp47);
          break;
        case 'definition':
          cmp = a.definition.localeCompare(b.definition, bcp47);
          break;
        case 'imageRequested':
          cmp = Number(a.imageRequested) - Number(b.imageRequested);
          break;
        case 'imageCount':
          cmp = a.imageCount - b.imageCount;
          break;
        case 'totalImageSizeKb':
          cmp = a.totalImageSizeKb - b.totalImageSizeKb;
          break;
        case 'hasSound':
          cmp = Number(a.hasSound) - Number(b.hasSound);
          break;
        case 'soundSizeKb':
          cmp = a.soundSizeKb - b.soundSizeKb;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [summaries, sortKey, sortDir, bcp47]);

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

  // --- Image handlers ---

  const handleGenerateImage = async (wordId: string) => {
    setRowErrors((prev) => ({ ...prev, [wordId]: '' }));
    setRowInProgress((prev) => ({ ...prev, [wordId]: true }));

    try {
      const reqResult = await requestImageGeneration(wordId);
      if (reqResult.message) {
        setRowErrors((prev) => ({ ...prev, [wordId]: reqResult.message! }));
        return;
      }

      setSummaries((prev) =>
        prev.map((item) =>
          item.wordId === wordId
            ? { ...item, imageRequested: true, imageInProgress: true }
            : item,
        ),
      );

      const res = await fetch(`/api/image/generate/${wordId}`, { method: 'POST' });
      const genResult: { message?: string; imageId?: string } = await res.json();
      if (!res.ok || genResult.message) {
        setRowErrors((prev) => ({
          ...prev,
          [wordId]: genResult.message ?? t('media.imageGenerationFailed'),
        }));
      } else {
        setSummaries((prev) =>
          prev.map((item) =>
            item.wordId === wordId
              ? {
                  ...item,
                  imageRequested: false,
                  imageInProgress: false,
                  imageCount: item.imageCount + 1,
                }
              : item,
          ),
        );
      }
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [wordId]: t('errors.generic'),
      }));
    } finally {
      setRowInProgress((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  const handleRemoveImageRequest = async (wordId: string) => {
    await removeImageRequest(wordId);
    setSummaries((prev) =>
      prev.map((item) =>
        item.wordId === wordId
          ? { ...item, imageRequested: false, imageInProgress: false }
          : item,
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

  const handleDeleteAllImages = async (wordId: string) => {
    setRowInProgress((prev) => ({ ...prev, [wordId]: true }));
    try {
      const result = await deleteAllImages(wordId);
      if (result?.message) {
        setRowErrors((prev) => ({ ...prev, [wordId]: result.message! }));
        return;
      }
      setSummaries((prev) =>
        prev.map((item) =>
          item.wordId === wordId ? { ...item, imageCount: 0, totalImageSizeKb: 0 } : item,
        ),
      );
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [wordId]: t('errors.generic'),
      }));
    } finally {
      setRowInProgress((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  // --- Sound handlers ---

  const handleGenerateSound = async (item: WordMediaSummary) => {
    const { wordId, courseId } = item;
    setRowErrors((prev) => ({ ...prev, [wordId]: '' }));
    setRowInProgress((prev) => ({ ...prev, [wordId]: true }));

    try {
      const res = await fetch(`/api/sound/word/${courseId}/${wordId}`);
      if (!res.ok) {
        const text = await res.text();
        setRowErrors((prev) => ({
          ...prev,
          [wordId]: text || t('media.soundGenerationFailed'),
        }));
      } else {
        setSummaries((prev) =>
          prev.map((s) => (s.wordId === wordId ? { ...s, hasSound: true } : s)),
        );
      }
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [wordId]: t('errors.generic'),
      }));
    } finally {
      setRowInProgress((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  const handlePlaySound = (item: WordMediaSummary) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const url = `/api/sound/word/${item.courseId}/${item.wordId}`;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingWordId(item.wordId);

    audio.onended = () => setPlayingWordId(null);
    audio.onerror = () => setPlayingWordId(null);
    audio.play();
  };

  const handleDeleteSound = async (wordId: string) => {
    setRowInProgress((prev) => ({ ...prev, [wordId]: true }));
    try {
      const result = await deleteSound(wordId);
      if (result?.message) {
        setRowErrors((prev) => ({ ...prev, [wordId]: result.message! }));
        return;
      }
      setSummaries((prev) =>
        prev.map((item) =>
          item.wordId === wordId ? { ...item, hasSound: false, soundSizeKb: 0 } : item,
        ),
      );
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [wordId]: t('errors.generic'),
      }));
    } finally {
      setRowInProgress((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  const isRowBusy = (item: WordMediaSummary) =>
    rowInProgress[item.wordId] || item.imageInProgress;

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="course-select" className={s.label}>
          {t('media.course')}
        </label>
        <div className="flex items-center gap-2 max-w-md">
          <select
            id="course-select"
            value={selectedCourseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className={`${s.input} flex-1`}
          >
            <option value="">{t('media.selectCourse')}</option>
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
                  {t('media.word')}
                  <SortIcon column="word" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('definition')}
                >
                  {t('media.translation')}
                  <SortIcon column="definition" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('imageRequested')}
                >
                  {t('media.imgReq')}
                  <SortIcon column="imageRequested" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('imageCount')}
                >
                  {t('media.images')}
                  <SortIcon column="imageCount" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('totalImageSizeKb')}
                >
                  {t('media.imgKb', { total: totalImageSizeKb.toLocaleString(bcp47) })}
                  <SortIcon column="totalImageSizeKb" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('hasSound')}
                >
                  {t('media.sound')}
                  <SortIcon column="hasSound" />
                </th>
                <th
                  className={`${s.th} cursor-pointer select-none`}
                  onClick={() => toggleSort('soundSizeKb')}
                >
                  {t('media.sndKb', { total: totalSoundSizeKb.toLocaleString(bcp47) })}
                  <SortIcon column="soundSizeKb" />
                </th>
                <th className={s.th}>{t('media.actions')}</th>
              </tr>
            </thead>
            <tbody className={s.tableDivider}>
              {sortedSummaries.map((item) => (
                <tr key={item.wordId}>
                  <td className={s.td}>{item.word}</td>
                  <td className={s.td}>{item.definition}</td>

                  {/* Image requested */}
                  <td className={s.td}>
                    {item.imageRequested && (
                      <CheckCircleIcon
                        className="w-5 h-5 text-green-500 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveImageRequest(item.wordId)}
                      />
                    )}
                  </td>

                  {/* Image count */}
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

                  {/* Image size */}
                  <td className={`${s.td} text-right tabular-nums`}>
                    {item.totalImageSizeKb > 0
                      ? item.totalImageSizeKb.toLocaleString(bcp47)
                      : ''}
                  </td>

                  {/* Sound */}
                  <td className={s.td}>
                    {item.hasSound ? (
                      <SpeakerWaveIcon
                        className={`w-5 h-5 cursor-pointer ${
                          playingWordId === item.wordId
                            ? 'text-blue-500 animate-pulse'
                            : 'text-green-500 hover:text-blue-500'
                        }`}
                        onClick={() => handlePlaySound(item)}
                      />
                    ) : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>

                  {/* Sound size */}
                  <td className={`${s.td} text-right tabular-nums`}>
                    {item.soundSizeKb > 0 ? item.soundSizeKb.toLocaleString(bcp47) : ''}
                  </td>

                  {/* Actions */}
                  <td className={s.td}>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleGenerateImage(item.wordId)}
                        disabled={isRowBusy(item)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRowBusy(item) ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <PhotoIcon className="w-4 h-4" />
                        )}
                        {t('media.genImage')}
                      </button>
                      {item.imageCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAllImages(item.wordId)}
                          disabled={isRowBusy(item)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <TrashIcon className="w-4 h-4" />
                          {t('media.delImages')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGenerateSound(item)}
                        disabled={isRowBusy(item)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRowBusy(item) ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <SpeakerWaveIcon className="w-4 h-4" />
                        )}
                        {t('media.genSound')}
                      </button>
                      {item.hasSound && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSound(item.wordId)}
                          disabled={isRowBusy(item)}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <TrashIcon className="w-4 h-4" />
                          {t('media.delSound')}
                        </button>
                      )}
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
        <p className="text-sm text-gray-500">{t('media.noWords')}</p>
      )}

      {galleryWordId && (
        <ImageGalleryDialog
          word={summaries.find((i) => i.wordId === galleryWordId)?.word}
          images={galleryImages}
          loading={galleryLoading}
          onDelete={handleDeleteImage}
          onClose={closeGallery}
        />
      )}
    </div>
  );
}
