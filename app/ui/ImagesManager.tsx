'use client';

import { useState } from 'react';
import { Course } from '@/app/lib/definitions';
import { WordImageSummary, GenerateImageResult } from '@/app/lib/types';
import { Spinner } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

type ImagesManagerProps = {
  courses: Course[];
  fetchSummaries: (courseId: string) => Promise<WordImageSummary[]>;
  requestGeneration: (wordId: string) => Promise<GenerateImageResult>;
};

export function ImagesManager({
  courses,
  fetchSummaries,
  requestGeneration,
}: Readonly<ImagesManagerProps>) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [summaries, setSummaries] = useState<WordImageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowInProgress, setRowInProgress] = useState<Record<string, boolean>>({});

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setRowErrors({});
    setRowInProgress({});

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

  const handleGenerate = async (wordId: string) => {
    setRowErrors((prev) => ({ ...prev, [wordId]: '' }));
    setRowInProgress((prev) => ({ ...prev, [wordId]: true }));

    try {
      const result = await requestGeneration(wordId);
      if (result.message) {
        setRowErrors((prev) => ({ ...prev, [wordId]: result.message! }));
      } else {
        setSummaries((prev) =>
          prev.map((s) =>
            s.wordId === wordId
              ? { ...s, requested: true, inProgress: true }
              : s,
          ),
        );
      }
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [wordId]: `Request failed: ${e}`,
      }));
    } finally {
      setRowInProgress((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <label htmlFor="course-select" className={s.label}>
          Course
        </label>
        <select
          id="course-select"
          value={selectedCourseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className={`${s.input} w-full max-w-md`}
        >
          <option value="">-- Select a course --</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
                <th className={s.th}>Word</th>
                <th className={s.th}>Translation</th>
                <th className={s.th}>Requested</th>
                <th className={s.th}>Images</th>
                <th className={s.th}>Action</th>
              </tr>
            </thead>
            <tbody className={s.tableDivider}>
              {summaries.map((item) => (
                <tr key={item.wordId}>
                  <td className={s.td}>{item.word}</td>
                  <td className={s.td}>{item.definition}</td>
                  <td className={s.td}>
                    {item.requested && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                  </td>
                  <td className={s.td}>
                    {item.imageCount > 0 && (
                      <span className="flex items-center gap-1">
                        <PhotoIcon className="w-4 h-4" />
                        {item.imageCount}
                      </span>
                    )}
                  </td>
                  <td className={s.td}>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleGenerate(item.wordId)}
                        disabled={
                          rowInProgress[item.wordId] || item.inProgress
                        }
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
    </div>
  );
}
