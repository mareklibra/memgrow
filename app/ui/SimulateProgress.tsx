'use client';

import clsx from 'clsx';
import { Fragment, useState, useMemo } from 'react';
import { Button } from '@/app/lib/material-tailwind-compat';
import { s } from '@/app/ui/styles';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { increaseMemLevel } from '@/app/lib/word-transitions';
import { DAY_MS, testWordsCountLimit } from '@/app/constants';
import type { SimulationWord } from '@/app/test/simulate/[courseId]/page';

type TimeSlot = {
  id: number;
  hour: number;
  minute: number;
  wordCount: number;
};

type DayResult = {
  date: Date;
  slots: { time: string; dueBefore: number; processed: number }[];
  remainingAtEnd: number;
};

const SIMULATION_DAYS = 14;

function runSimulation(words: SimulationWord[], slots: TimeSlot[]): DayResult[] {
  const state = words.map((w) => ({
    memLevel: w.memLevel,
    repeatAgain: new Date(w.repeatAgain).getTime(),
  }));

  const sortedSlots = [...slots].sort(
    (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const results: DayResult[] = [];

  for (let day = 0; day < SIMULATION_DAYS; day++) {
    const dayStart = todayStart + day * DAY_MS;
    const daySlotResults: DayResult['slots'] = [];

    for (const slot of sortedSlots) {
      const slotTime = dayStart + slot.hour * 3600_000 + slot.minute * 60_000;
      const timeLabel = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;

      const dueIndices: number[] = [];
      for (let i = 0; i < state.length; i++) {
        if (state[i].repeatAgain <= slotTime) {
          dueIndices.push(i);
        }
      }

      dueIndices.sort((a, b) => state[a].memLevel - state[b].memLevel);

      const toProcess = dueIndices.slice(0, slot.wordCount);
      for (const idx of toProcess) {
        const newLevel = increaseMemLevel(state[idx].memLevel);
        state[idx].memLevel = newLevel;
        state[idx].repeatAgain = slotTime + DAY_MS * newLevel;
      }

      daySlotResults.push({
        time: timeLabel,
        dueBefore: dueIndices.length,
        processed: toProcess.length,
      });
    }

    const dayEnd = dayStart + DAY_MS;
    let remainingAtEnd = 0;
    for (const w of state) {
      if (w.repeatAgain <= dayEnd) {
        remainingAtEnd++;
      }
    }

    const date = new Date(dayStart);
    results.push({ date, slots: daySlotResults, remainingAtEnd });
  }

  return results;
}

const defaultSlot = (): TimeSlot => ({
  id: Date.now(),
  hour: 8,
  minute: 0,
  wordCount: 22,
});

export function SimulateProgress({ words }: { words: SimulationWord[] }) {
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

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`;
  };

  return (
    <div className="max-w-2xl">
      <p className={clsx(s.simLabel, 'mb-4')}>
        {words.length} words in testing pool, {dueNow} currently due for review.
      </p>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Daily testing schedule</h2>
        <div className="space-y-3">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3">
              <label className={clsx(s.simLabel, 'w-10')}>Time</label>
              <input
                type="time"
                value={`${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`}
                onChange={(e) => updateSlotTime(slot.id, e.target.value)}
                className={s.simInput}
              />
              <label className={clsx(s.simLabel, 'ml-2')}>Words</label>
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
          Add time slot
        </button>
      </div>

      <Button onClick={() => setHasRun(true)} className="mb-6">
        Run simulation
      </Button>

      {results && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            14-day forecast (all answers correct)
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-2 pr-3">Day</th>
                {results[0].slots.map((s, i) => (
                  <th key={i} className="text-right py-2 px-2" colSpan={2}>
                    {s.time}
                  </th>
                ))}
                <th className="text-right py-2 pl-3">Remaining</th>
              </tr>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th></th>
                {results[0].slots.map((_, i) => (
                  <Fragment key={i}>
                    <th className="text-right px-1 pb-1">due</th>
                    <th className="text-right px-1 pb-1">done</th>
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
