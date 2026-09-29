'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCourse, promoteCourse } from '@/app/lib/actions';
import type { AdminCourse } from '@/app/lib/definitions';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import ConfirmationDialog from '@/app/ui/ConfirmationDialog';
import { cn, s } from '@/app/ui/styles';

type PendingAction = { type: 'delete' | 'promote'; course: AdminCourse } | null;

function FilterField({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="flex min-w-40 flex-col gap-1 text-xs font-medium uppercase text-gray-500">
      {label}
      {children}
    </label>
  );
}

export function AdminCourses({ courses }: Readonly<{ courses: AdminCourse[] }>) {
  const { t } = useTranslation();
  const router = useRouter();
  const [nameQuery, setNameQuery] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [learningLang, setLearningLang] = useState('');
  const [knownLang, setKnownLang] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState<PendingAction>(null);
  const [typedName, setTypedName] = useState('');

  const owners = useMemo(() => {
    const byId = new Map<string, string>();
    for (const course of courses) {
      if (course.ownerUserId) {
        byId.set(course.ownerUserId, course.ownerName ?? course.ownerUserId);
      }
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [courses]);

  const learningLangs = useMemo(
    () => [...new Set(courses.map((course) => course.learningLang))].sort(),
    [courses],
  );
  const knownLangs = useMemo(
    () => [...new Set(courses.map((course) => course.knownLang))].sort(),
    [courses],
  );

  const visible = courses.filter((course) => {
    const needle = nameQuery.trim().toLowerCase();
    if (needle && !course.name.toLowerCase().includes(needle)) return false;
    if (ownerId && course.ownerUserId !== ownerId) return false;
    if (learningLang && course.learningLang !== learningLang) return false;
    if (knownLang && course.knownLang !== knownLang) return false;
    return true;
  });

  const closePending = () => {
    setPending(null);
    setTypedName('');
  };

  const handleDelete = async () => {
    if (pending?.type !== 'delete') return false;
    setError(undefined);
    const result = await deleteCourse(pending.course.id, typedName);
    if (result?.message) {
      setError(result.message);
      return false;
    }
    router.refresh();
  };

  const handlePromote = async () => {
    if (pending?.type !== 'promote') return false;
    setError(undefined);
    const result = await promoteCourse(pending.course.id);
    if (result?.message) {
      setError(result.message);
      return false;
    }
    router.refresh();
  };

  const nameMatches =
    pending?.type === 'delete' && typedName.trim() === pending.course.name;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t('settings.allCourses')}</h2>
      {error && <p className={`text-sm ${s.errorText}`}>{error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label={t('course.filterName')}>
          <input
            type="search"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            className={s.input}
          />
        </FilterField>
        <FilterField label={t('settings.owner')}>
          <select
            className={s.input}
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          >
            <option value="">{t('settings.anyone')}</option>
            {owners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t('course.filterLearning')}>
          <select
            className={s.input}
            value={learningLang}
            onChange={(e) => setLearningLang(e.target.value)}
          >
            <option value="">{t('course.anyLanguage')}</option>
            {learningLangs.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t('course.filterKnown')}>
          <select
            className={s.input}
            value={knownLang}
            onChange={(e) => setKnownLang(e.target.value)}
          >
            <option value="">{t('course.anyLanguage')}</option>
            {knownLangs.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
      <div className="overflow-x-auto">
        <table className={cn('min-w-full', s.tableDivider)}>
          <thead>
            <tr>
              <th scope="col" className={s.th}>
                {t('course.name')}
              </th>
              <th scope="col" className={s.th}>
                {t('settings.owner')}
              </th>
              <th scope="col" className={s.th}>
                {t('course.filterLearning')}
              </th>
              <th scope="col" className={s.th}>
                {t('course.filterKnown')}
              </th>
              <th scope="col" className={s.th}>
                {t('settings.actions')}
              </th>
            </tr>
          </thead>
          <tbody className={s.tableDivider}>
            {visible.map((course) => (
              <tr key={course.id}>
                <td className={s.td}>{course.name}</td>
                <td className={s.td}>{course.ownerName ?? ''}</td>
                <td className={s.td}>{course.learningLang}</td>
                <td className={s.td}>{course.knownLang}</td>
                <td className={s.td}>
                  <div className="flex gap-3">
                    {!course.isPublic && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(undefined);
                          setPending({ type: 'promote', course });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {t('settings.promote')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setError(undefined);
                        setTypedName('');
                        setPending({ type: 'delete', course });
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      {t('settings.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationDialog
        isOpen={pending?.type === 'delete'}
        onClose={closePending}
        onConfirm={handleDelete}
        title={t('settings.deleteCourse')}
        message={
          pending?.type === 'delete'
            ? t('settings.deleteCourseConfirm', {
                name: pending.course.name,
                owner: pending.course.ownerName ?? '—',
                learning: pending.course.learningLang,
                known: pending.course.knownLang,
              })
            : ''
        }
        confirmText={t('settings.delete')}
        confirmDisabled={!nameMatches}
        variant="danger"
      >
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t('settings.deleteCourseTypeName')}
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className={s.input}
            autoComplete="off"
          />
        </label>
      </ConfirmationDialog>

      <ConfirmationDialog
        isOpen={pending?.type === 'promote'}
        onClose={closePending}
        onConfirm={handlePromote}
        title={t('settings.promote')}
        message={
          pending?.type === 'promote'
            ? t('settings.promoteConfirm', { name: pending.course.name })
            : ''
        }
        confirmText={t('settings.promote')}
        variant="warning"
      />
    </div>
  );
}
