'use client';

import clsx from 'clsx';
import { Fragment, useState, useMemo } from 'react';
import { Button } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { testWordsCountLimit } from '@/app/constants';
import { runSimulation } from '@/app/lib/simulate';
import type { SimulationWord, TimeSlot } from '@/app/lib/simulate';
import { useTranslation } from '@/app/lib/i18n/useTranslation';
import { formatSimDate } from '@/app/lib/i18n/format';

const defaultSlot = (): TimeSlot => ({
  id: Date.now(),
  hour: 8,
  minute: 0,
  wordCount: 22,
});

export function SimulateProgress({ words }: { words: SimulationWord[] }) {
  const { t, locale } = useTranslation();
  const [slots, setSlots] = useState<TimeSlot[]>([defaultSlot()]);
  const [hasRun, setHasRun] = useState(false);
  const [mountTime] = useState(() => Date.now());

  const dueNow = useMemo(
    () => words.filter((w) => new Date(w.repeatAgain).getTime() <= mountTime).length,
    [words, mountTime],
  );

  const results = useMemo(() => {
    if (!hasRun) return null;
    return runSimulation(words, slots);
  }, [hasRun, words, slots]);

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      { id: Date.now(), hour: 18, minute: 0, wordCount: testWordsCountLimit },
    ]);
    setHasRun(false);
  };

  const removeSlot = (id: number) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setHasRun(false);
  };

  const updateSlot = (id: number, field: keyof TimeSlot, value: number) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    setHasRun(false);
  };

  const updateSlotTime = (id: number, timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, hour: h, minute: m } : s)));
    setHasRun(false);
  };

  const formatDate = (date: Date) => formatSimDate(date, locale);

  return (
    <div className="max-w-2xl">
      <p className={clsx(s.simLabel, 'mb-4')}>
        {t('test.poolSummary', { total: words.length, due: dueNow })}
      </p>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">{t('test.dailySchedule')}</h2>
        <div className="space-y-3">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3">
              <label className={clsx(s.simLabel, 'w-10')}>{t('test.time')}</label>
              <input
                type="time"
                value={`${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`}
                onChange={(e) => updateSlotTime(slot.id, e.target.value)}
                className={s.simInput}
              />
              <label className={clsx(s.simLabel, 'ml-2')}>{t('test.words')}</label>
              <input
                type="number"
                min={1}
                max={500}
                value={slot.wordCount}
                onChange={(e) =>
                  updateSlot(
                    slot.id,
                    'wordCount',
                    Math.max(1, parseInt(e.target.value) || 1),
                  )
                }
                className={clsx(s.simInput, 'w-20')}
              />
              {slots.length > 1 && (
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="text-danger hover:text-red-700 p-1"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addSlot}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <PlusIcon className="h-4 w-4" />
          {t('test.addTimeSlot')}
        </button>
      </div>

      <Button onClick={() => setHasRun(true)} className="mb-6">
        {t('test.runSimulation')}
      </Button>

      {results && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t('test.forecast')}</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 pr-3">{t('test.day')}</th>
                {results[0].slots.map((s, i) => (
                  <th key={i} className="text-right py-2 px-2" colSpan={2}>
                    {s.time}
                  </th>
                ))}
                <th className="text-right py-2 pl-3">{t('test.remaining')}</th>
              </tr>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th></th>
                {results[0].slots.map((_, i) => (
                  <Fragment key={i}>
                    <th className="text-right px-1 pb-1">{t('test.due')}</th>
                    <th className="text-right px-1 pb-1">{t('test.done')}</th>
                  </Fragment>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((day, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-100 ${idx === 0 ? 'font-semibold' : ''}`}
                >
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {formatDate(day.date)}
                  </td>
                  {day.slots.map((slot, si) => (
                    <Fragment key={si}>
                      <td className="text-right px-1 text-gray-600">{slot.dueBefore}</td>
                      <td className="text-right px-1">{slot.processed}</td>
                    </Fragment>
                  ))}
                  <td
                    className={`text-right py-1.5 pl-3 font-medium ${
                      day.remainingAtEnd === 0
                        ? 'text-green-600'
                        : day.remainingAtEnd > 50
                          ? 'text-red-600'
                          : 'text-orange-600'
                    }`}
                  >
                    {day.remainingAtEnd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
