import { increaseMemLevel } from './word-transitions';
import { DAY_MS } from '../constants';

export type SimulationWord = {
  memLevel: number;
  repeatAgain: string;
};

export type TimeSlot = {
  id: number;
  hour: number;
  minute: number;
  wordCount: number;
};

export type DayResult = {
  date: Date;
  slots: { time: string; dueBefore: number; processed: number }[];
  remainingAtEnd: number;
};

export const SIMULATION_DAYS = 14;

export function runSimulation(words: SimulationWord[], slots: TimeSlot[]): DayResult[] {
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
