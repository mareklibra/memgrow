'use client';
import { useState } from 'react';
import { Course as CourseType } from '@/app/lib/definitions';
import { s } from '@/app/ui/styles';
import { ArrowPathIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Switch } from '@/app/lib/material-tailwind-compat';
import {
  FilterBar,
  FilterSearch,
  FilterSelect,
  uniqueSorted,
} from '@/app/ui/CourseFilters';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { localeToBcp47 } from '@/app/lib/i18n';
import { formatDateToLocal } from '@/app/lib/utils';
import { upsertCoursePriority } from '@/app/lib/actions';

const Course = ({
  course,
  pathPrefix,
  showPriority,
  showFastEntry,
  showForOffline,
  showSimulate,
  showStar,
  priority,
  onToggleStar,
}: {
  course: CourseType;
  pathPrefix: string;
  showPriority: boolean;
  showFastEntry: boolean;
  showForOffline: boolean;
  showSimulate: boolean;
  showStar: boolean;
  priority: number;
  onToggleStar: (courseId: string, next: number) => void;
}) => {
  const [isPriorityFirst, setIsPriorityFirst] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const { t, locale } = useTranslation();
  const showAdvancedBatch =
    showPriority &&
    Number(course.toTest) === 0 &&
    !!course.advancedBatchUntil &&
    !isPriorityFirst;
  const shownByDefault = priority > 0;

  let link = `${pathPrefix}/${course.id}`;
  if (showPriority) {
    link += `?priorityFirst=${isPriorityFirst}`;
  }
  if (showForOffline) {
    if (link.includes('?')) {
      link += `&offline=${isOffline}`;
    } else {
      link += `?offline=${isOffline}`;
    }
  }

  return (
    <div id={`course-${course.id}`} className={s.courseCard}>
      <div className="p-4">
        <div className="flex flex-row items-start justify-between gap-2">
          <Link href={link} onClick={() => setNavigating(true)}>
            <h5 className="flex flex-row items-center mb-2 text-slate-800 text-xl font-semibold">
              {navigating ? (
                <ArrowPathIcon className="h-5 w-5 text-gray-900 animate-spin" />
              ) : (
                <ChevronDoubleRightIcon className="h-5 w-5 text-gray-900" />
              )}
              <div className="text-base font-semibold text-gray-900">{course.name}</div>

              <Image
                className="ml-2"
                src={`/${course.courseCode}_flag.svg`}
                width={20}
                height={20}
                alt={t('course.flagAlt', {
                  learning: course.learningLang,
                  code: course.courseCode,
                })}
              />
            </h5>
            <p className="text-slate-600 leading-normal font-light">
              {t('course.learningFrom', {
                learning: course.learningLang,
                known: course.knownLang,
              })}
            </p>
          </Link>
          {showStar && (
            <button
              type="button"
              aria-pressed={shownByDefault}
              aria-label={
                shownByDefault ? t('course.showByDefault') : t('course.hiddenUntilAll')
              }
              onClick={() => onToggleStar(course.id, shownByDefault ? 0 : 1)}
            >
              {shownByDefault ? (
                <StarIcon className="h-6 w-6 text-yellow-400" />
              ) : (
                <StarOutlineIcon className="h-6 w-6 text-gray-400" />
              )}
            </button>
          )}
        </div>

        <p className="text-slate-600 leading-normal font-light text-xs">
          {showAdvancedBatch
            ? t('course.advancedBatchTill', {
                date: formatDateToLocal(
                  course.advancedBatchUntil!,
                  localeToBcp47(locale),
                ),
              })
            : t('course.stats', {
                toTest: course.toTest,
                toLearn: course.toLearn,
                total: course.total,
              })}
        </p>

        <div className="flex justify-between mt-3">
          {showPriority && (
            <Switch
              label={t('course.priorities', { count: course.withPriority })}
              checked={isPriorityFirst}
              onChange={() => setIsPriorityFirst(!isPriorityFirst)}
              disabled={course.withPriority <= 0}
            />
          )}

          {showForOffline && (
            <Switch
              label={t('course.batchMode')}
              checked={isOffline}
              onChange={() => setIsOffline(!isOffline)}
            />
          )}
        </div>

        {showFastEntry && (
          <div className="flex justify-end mt-2">
            <Link href={`/edit/fastentry/${course.id}`}>{t('course.fastEntry')}</Link>
          </div>
        )}

        {showSimulate && (
          <div className="flex justify-end mt-2">
            <Link
              href={`/test/simulate/${course.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {t('course.simulateProgress')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const ChooseCourse = ({
  courses,
  pathPrefix,
  showPriority,
  showFastEntry,
  showForOffline,
  showSimulate = false,
  showAllSwitch = true,
}: {
  courses: CourseType[];
  pathPrefix: string;
  showPriority: boolean;
  showFastEntry: boolean;
  showForOffline: boolean;
  showSimulate?: boolean;
  showAllSwitch?: boolean;
}) => {
  const [showAll, setShowAll] = useState(false);
  const [priorityOverride, setPriorityOverride] = useState<Record<string, number>>({});
  const [nameQuery, setNameQuery] = useState('');
  const [learningLang, setLearningLang] = useState('');
  const [knownLang, setKnownLang] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [publicOnly, setPublicOnly] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  const priorityOf = (course: CourseType) =>
    priorityOverride[course.id] ?? course.coursePriority ?? 0;

  const toggleStar = async (courseId: string, next: number) => {
    setPriorityOverride((current) => ({ ...current, [courseId]: next }));
    const result = await upsertCoursePriority(courseId, next);
    if (result?.message) {
      setPriorityOverride((current) => {
        const copy = { ...current };
        delete copy[courseId];
        return copy;
      });
      return;
    }
    router.refresh();
  };

  let visibleCourses = courses;
  if (showAllSwitch && !showAll) {
    visibleCourses = courses.filter((course) => priorityOf(course) > 0);
  }
  if (showAllSwitch && showAll) {
    const needle = nameQuery.trim().toLowerCase();
    visibleCourses = courses.filter((course) => {
      if (needle && !course.name.toLowerCase().includes(needle)) return false;
      if (learningLang && course.learningLang !== learningLang) return false;
      if (knownLang && course.knownLang !== knownLang) return false;
      if (mineOnly && !course.ownedByMe) return false;
      if (publicOnly && !course.isPublic) return false;
      return true;
    });
  }

  return (
    <div className="w-10/12" id="choose-course">
      {showAllSwitch && (
        <div className="flex justify-end mb-2">
          <Switch
            label={t('course.all')}
            checked={showAll}
            onChange={() => setShowAll(!showAll)}
          />
        </div>
      )}
      {showAllSwitch && showAll && (
        <FilterBar className="mb-4">
          <FilterSearch
            label={t('course.filterName')}
            value={nameQuery}
            onChange={setNameQuery}
          />
          <FilterSelect
            label={t('course.filterLearning')}
            value={learningLang}
            onChange={setLearningLang}
            emptyLabel={t('course.anyLanguage')}
            options={uniqueSorted(courses.map((course) => course.learningLang))}
          />
          <FilterSelect
            label={t('course.filterKnown')}
            value={knownLang}
            onChange={setKnownLang}
            emptyLabel={t('course.anyLanguage')}
            options={uniqueSorted(courses.map((course) => course.knownLang))}
          />
          <div className="flex h-[42px] shrink-0 items-center gap-4">
            <Switch
              label={t('course.filterMine')}
              checked={mineOnly}
              onChange={() => setMineOnly(!mineOnly)}
            />
            <Switch
              label={t('course.filterPublic')}
              checked={publicOnly}
              onChange={() => setPublicOnly(!publicOnly)}
            />
          </div>
        </FilterBar>
      )}
      <div className="flex flex-wrap">
        {visibleCourses.map((course) => (
          <Course
            course={course}
            key={course.id}
            pathPrefix={pathPrefix}
            showPriority={showPriority}
            showFastEntry={showFastEntry}
            showForOffline={showForOffline}
            showSimulate={showSimulate}
            showStar={showAllSwitch}
            priority={priorityOf(course)}
            onToggleStar={toggleStar}
          />
        ))}
      </div>
    </div>
  );
};
