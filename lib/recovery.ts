/**
 * Before testing recovery flows, run in the Supabase SQL Editor:
 *
 * GRANT SELECT, INSERT, UPDATE, DELETE ON public.recovery_events
 * TO authenticated;
 */

import { isScheduledToday } from '@/lib/streaks';
import { supabase } from '@/lib/supabase';
import type { Habit, HabitLog } from '@/types/database';

const TEST_USER_ID = '3f550a2e-613e-4fa4-93ed-b0180ab5f7b2';

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateString(): string {
  const now = new Date();
  return formatDateString(now);
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateString(yesterday);
}

export function getDaysBetween(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T12:00:00`);
  const b = new Date(`${dateB}T12:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / msPerDay);
}

function getDateStringDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDateString(date);
}

function getHabitCreatedDate(habit: Habit): string {
  return habit.created_at.split('T')[0];
}

export function isInGracePeriod(habit: Habit): boolean {
  const today = getLocalDateString();
  const createdDate = getHabitCreatedDate(habit);
  return getDaysBetween(createdDate, today) < 7;
}

function wasMissedOnDate(habit: Habit, dateStr: string, logs: HabitLog[]): boolean {
  const date = new Date(`${dateStr}T12:00:00`);
  const scheduled = isScheduledToday(habit.schedule_type, habit.schedule_days, date);

  if (!scheduled) {
    return false;
  }

  const log = logs.find((entry) => entry.habit_id === habit.habit_id && entry.date === dateStr);

  return !log || log.status === 'missed';
}

async function fetchLogsForDates(dates: string[]): Promise<HabitLog[]> {
  if (dates.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .in('date', dates);

  if (error) {
    console.error('fetchLogsForDates:', error);
    return [];
  }

  return data ?? [];
}

export async function fetchMissedHabits(habits: Habit[]): Promise<Habit[]> {
  const yesterday = getYesterdayDateString();
  const logs = await fetchLogsForDates([yesterday]);
  const missed: Habit[] = [];

  for (const habit of habits) {
    if (isInGracePeriod(habit)) {
      continue;
    }

    if (wasMissedOnDate(habit, yesterday, logs)) {
      missed.push(habit);
    }
  }

  return missed;
}

export async function fetchRepeatedMissHabits(habits: Habit[]): Promise<Habit[]> {
  const yesterday = getYesterdayDateString();
  const dayBeforeYesterday = getDateStringDaysAgo(2);
  const logs = await fetchLogsForDates([yesterday, dayBeforeYesterday]);
  const repeated: Habit[] = [];

  for (const habit of habits) {
    if (isInGracePeriod(habit)) {
      continue;
    }

    const missedYesterday = wasMissedOnDate(habit, yesterday, logs);
    const missedDayBefore = wasMissedOnDate(habit, dayBeforeYesterday, logs);

    if (missedYesterday && missedDayBefore) {
      repeated.push(habit);
    }
  }

  return repeated;
}

type LogRecoveryParams = {
  habit: Habit;
  missedDate: string;
  recoveryType: 'tiny_version' | 'adjusted_habit' | 'manual_recovery';
};

export async function logRecovery(params: LogRecoveryParams): Promise<boolean> {
  const today = getLocalDateString();

  const { error: recoveryError } = await supabase.from('recovery_events').insert({
    habit_id: params.habit.habit_id,
    user_id: TEST_USER_ID,
    missed_date: params.missedDate,
    recovery_date: today,
    recovery_type: params.recoveryType,
    status: 'completed',
  });

  if (recoveryError) {
    console.error('logRecovery recovery_events:', recoveryError);
    return false;
  }

  const { error: logError } = await supabase.from('habit_logs').upsert(
    {
      habit_id: params.habit.habit_id,
      user_id: TEST_USER_ID,
      date: today,
      status: 'recovered',
      source: 'app',
      is_retroactive_edit: false,
      completed_at: null,
    },
    { onConflict: 'habit_id,date' },
  );

  if (logError) {
    console.error('logRecovery habit_logs:', logError);
    return false;
  }

  return true;
}

type DismissRecoveryParams = {
  habit: Habit;
  missedDate: string;
};

export async function dismissRecovery(params: DismissRecoveryParams): Promise<void> {
  const today = getLocalDateString();

  const { error } = await supabase.from('recovery_events').insert({
    habit_id: params.habit.habit_id,
    user_id: TEST_USER_ID,
    missed_date: params.missedDate,
    recovery_date: today,
    recovery_type: 'manual_recovery',
    status: 'dismissed',
  });

  if (error) {
    console.error('dismissRecovery:', error);
  }
}
