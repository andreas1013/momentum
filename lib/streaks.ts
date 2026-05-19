import type { HabitStatus } from '@/types/database';

export type DayStatus = HabitStatus | 'not_scheduled';

export interface DayRecord {
  date: string; // YYYY-MM-DD
  status: DayStatus;
}

export interface StreakResult {
  perfectCurrent: number;
  perfectBest: number;
  momentumCurrent: number;
  momentumBest: number;
}

function applyPerfectStreak(current: number, status: DayStatus): number {
  switch (status) {
    case 'done':
      return current + 1;
    case 'missed':
      return 0;
    case 'tiny_done':
    case 'recovered':
    case 'rest_day':
    case 'skipped':
    case 'not_scheduled':
      return current;
  }
}

function applyMomentumStreak(current: number, status: DayStatus): number {
  switch (status) {
    case 'done':
    case 'tiny_done':
    case 'recovered':
      return current + 1;
    case 'missed':
      return 0;
    case 'rest_day':
    case 'skipped':
    case 'not_scheduled':
      return current;
  }
}

/**
 * calculateStreaks — walk chronological days and track perfect/momentum streaks.
 *
 * @example
 * Input:  [{ date: '2026-05-01', status: 'done' }, { date: '2026-05-02', status: 'done' }, { date: '2026-05-03', status: 'missed' }]
 * Output: { perfectCurrent: 0, perfectBest: 2, momentumCurrent: 0, momentumBest: 2 }
 *
 * @example
 * Input:  [{ date: '2026-05-01', status: 'done' }, { date: '2026-05-02', status: 'tiny_done' }]
 * Output: { perfectCurrent: 1, perfectBest: 1, momentumCurrent: 2, momentumBest: 2 }
 *
 * @example
 * Input:  [{ date: '2026-05-01', status: 'done' }, { date: '2026-05-02', status: 'rest_day' }, { date: '2026-05-03', status: 'done' }]
 * Output: { perfectCurrent: 2, perfectBest: 2, momentumCurrent: 2, momentumBest: 2 }
 */
export function calculateStreaks(days: DayRecord[]): StreakResult {
  let perfectCurrent = 0;
  let perfectBest = 0;
  let momentumCurrent = 0;
  let momentumBest = 0;

  for (const day of days) {
    perfectCurrent = applyPerfectStreak(perfectCurrent, day.status);
    momentumCurrent = applyMomentumStreak(momentumCurrent, day.status);

    perfectBest = Math.max(perfectBest, perfectCurrent);
    momentumBest = Math.max(momentumBest, momentumCurrent);
  }

  return {
    perfectCurrent,
    perfectBest,
    momentumCurrent,
    momentumBest,
  };
}

/**
 * getMonthlyConsistency — share of scheduled days with a completing status.
 *
 * @example
 * Input:  [{ status: 'done' }, { status: 'missed' }, { status: 'not_scheduled' }]
 * Output: 50.0  // 1 of 2 scheduled days completed
 *
 * @example
 * Input:  [{ status: 'tiny_done' }, { status: 'recovered' }, { status: 'rest_day' }]
 * Output: 100.0  // 2 of 2 scheduled days completed (rest_day excluded from count)
 *
 * @example
 * Input:  [{ status: 'not_scheduled' }, { status: 'skipped' }]
 * Output: 0  // no scheduled days
 */
export function getMonthlyConsistency(days: DayRecord[]): number {
  let completed = 0;
  let scheduled = 0;

  for (const day of days) {
    if (
      day.status === 'not_scheduled' ||
      day.status === 'rest_day' ||
      day.status === 'skipped'
    ) {
      continue;
    }

    scheduled += 1;

    if (day.status === 'done' || day.status === 'tiny_done' || day.status === 'recovered') {
      completed += 1;
    }
  }

  if (scheduled === 0) {
    return 0;
  }

  return Math.round((completed / scheduled) * 1000) / 10;
}

/**
 * isScheduledToday — whether a habit is due on the given date.
 *
 * @example
 * isScheduledToday('daily', [], new Date('2026-05-18')) → true
 *
 * @example
 * isScheduledToday('weekdays', [], new Date('2026-05-18')) → true  // Monday
 * isScheduledToday('weekdays', [], new Date('2026-05-17')) → false // Sunday
 *
 * @example
 * isScheduledToday('custom', [1, 3, 5], new Date('2026-05-18')) → true  // Monday = 1
 */
export function isScheduledToday(
  scheduleType: string,
  scheduleDays: number[],
  date: Date,
): boolean {
  const dayOfWeek = date.getDay();

  switch (scheduleType) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'custom':
      return scheduleDays.includes(dayOfWeek);
    default:
      return false;
  }
}
