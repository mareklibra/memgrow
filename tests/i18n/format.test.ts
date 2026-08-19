import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTranslator } from '@/app/lib/i18n';
import { formatRelativeTime, formatSimDate } from '@/app/lib/i18n/format';

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the just-now message under one minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'));
    const t = createTranslator('en');
    expect(formatRelativeTime(Date.now() - 10_000, 'en', t)).toBe('just now');
  });

  it('uses Intl relative time for older timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00Z'));
    const t = createTranslator('en');
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    expect(formatRelativeTime(threeHoursAgo, 'en', t)).toMatch(/3/);
  });
});

describe('formatSimDate', () => {
  it('includes a localized weekday and day.month.', () => {
    const date = new Date(2026, 7, 19);
    const en = formatSimDate(date, 'en');
    const cs = formatSimDate(date, 'cs');
    expect(en).toMatch(/19\.8\./);
    expect(cs).toMatch(/19\.8\./);
    expect(en).not.toBe(cs);
  });
});
