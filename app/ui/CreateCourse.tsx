'use client';

import { useId, useState } from 'react';
import { COURSE_CODES } from '@/app/constants';
import { s } from '@/app/ui/styles';
import { Button, Input } from '@/app/lib/material-tailwind-compat';
import { useTranslation } from '@/app/lib/i18n/useTranslation';

type CourseDraft = {
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
};

type SaveCourse = (course: CourseDraft) => Promise<{ message?: string } | undefined>;

type CourseKind = 'private' | 'shared';

export function CreateCourse({
  onSavePrivate,
  onSavePublic,
}: Readonly<{
  onSavePrivate: SaveCourse;
  onSavePublic?: SaveCourse;
}>) {
  const [name, setName] = useState('');
  const [learningLang, setLearningLang] = useState('');
  const [knownLang, setKnownLang] = useState('');
  const [courseCode, setCourseCode] = useState<string>(COURSE_CODES[0]);
  const [kind, setKind] = useState<CourseKind>('private');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const courseCodeId = useId();
  const kindGroup = useId();
  const { t } = useTranslation();
  const canChooseKind = !!onSavePublic;
  const selectedKind: CourseKind = canChooseKind ? kind : 'private';

  const handleSave = async () => {
    if (submitting) return;
    setError(undefined);
    setSubmitting(true);
    try {
      const draft = { name, learningLang, knownLang, courseCode };
      const result =
        selectedKind === 'shared' && onSavePublic
          ? await onSavePublic(draft)
          : await onSavePrivate(draft);
      if (result?.message) {
        setError(result.message);
      } else {
        setName('');
        setLearningLang('');
        setKnownLang('');
        setCourseCode(COURSE_CODES[0]);
        setKind('private');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="my-2 w-full max-w-2xl rounded-lg border border-gray-300 bg-white p-4 shadow-xs">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {t('course.newCourse')}
      </h2>

      {canChooseKind && (
        <fieldset className="mt-4 mb-4">
          <legend className="mb-2 text-sm text-gray-700">{t('course.kind')}</legend>
          <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1">
            <KindOption
              name={kindGroup}
              value="private"
              checked={kind === 'private'}
              onChange={() => setKind('private')}
              label={t('course.kindMine')}
            />
            <KindOption
              name={kindGroup}
              value="shared"
              checked={kind === 'shared'}
              onChange={() => setKind('shared')}
              label={t('course.kindShared')}
            />
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('course.name')}
          value={name}
          size="lg"
          onChange={(e) => setName(e.target.value)}
          minLength={2}
        />
        <div className="relative h-11">
          <select
            id={courseCodeId}
            className="h-full w-full rounded-md border border-blue-gray-200 bg-transparent px-3 text-sm text-blue-gray-700 outline-none focus:border-2 focus:border-gray-900"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
          >
            {COURSE_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <label
            htmlFor={courseCodeId}
            className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-[11px] font-normal leading-tight text-blue-gray-400"
          >
            {t('course.courseCode')}
          </label>
        </div>
        <Input
          label={t('course.learningLanguage')}
          value={learningLang}
          size="lg"
          onChange={(e) => setLearningLang(e.target.value)}
          minLength={2}
        />
        <Input
          label={t('course.fromLanguage')}
          value={knownLang}
          size="lg"
          onChange={(e) => setKnownLang(e.target.value)}
          minLength={2}
        />
      </div>

      <div className="mt-4 flex flex-col items-start gap-2">
        <Button className="h-fit" onClick={handleSave} disabled={submitting}>
          {selectedKind === 'shared'
            ? t('course.createPublic')
            : t('course.createPrivate')}
        </Button>
        {error && <p className={s.errorText}>{error}</p>}
      </div>
    </div>
  );
}

function KindOption({
  name,
  value,
  checked,
  onChange,
  label,
}: Readonly<{
  name: string;
  value: CourseKind;
  checked: boolean;
  onChange: () => void;
  label: string;
}>) {
  return (
    <label
      className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${
        checked ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}
