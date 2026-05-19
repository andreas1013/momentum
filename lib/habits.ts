import { calculateStreaks, DayRecord, getMonthlyConsistency, isScheduledToday } from '@/lib/streaks';
import { supabase } from '@/lib/supabase';
import type { Habit, HabitLog, HabitStatus } from '@/types/database';

const TEST_EMAIL = 'test@momentum.app';
const TEST_PASSWORD = 'X/yv8$6cuzwgZiH';

export async function signInTestUser(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return; // already signed in

  const { error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    console.error('signInTestUser:', error);
  }
}

const TEST_USER_ID = '3f550a2e-613e-4fa4-93ed-b0180ab5f7b2';

export async function fetchActiveHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchActiveHabits:', error);
    return [];
  }

  return data ?? [];
}

export async function fetchTodayLogs(date: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('date', date);

  if (error) {
    console.error('fetchTodayLogs:', error);
    return [];
  }

  return data ?? [];
}

type UpsertHabitLogParams = {
  habit_id: string;
  date: string;
  status: HabitStatus;
  source?: 'app' | 'notification' | 'manual_edit';
};

export async function upsertHabitLog(params: UpsertHabitLogParams): Promise<HabitLog | null> {
  const { habit_id, date, status, source = 'app' } = params;
  const completed_at =
    status === 'done' || status === 'tiny_done' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      {
        habit_id,
        user_id: TEST_USER_ID,
        date,
        status,
        source,
        completed_at,
        is_retroactive_edit: false,
      },
      { onConflict: 'habit_id,date' },
    )
    .select()
    .single();

  if (error) {
    console.error('upsertHabitLog:', error);
    return null;
  }

  return data;
}

export async function fetchHabitStreaks(
  habit: Habit,
): Promise<{ perfectCurrent: number; momentumCurrent: number }> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('date, status')
    .eq('habit_id', habit.habit_id)
    .eq('user_id', TEST_USER_ID)
    .order('date', { ascending: true });

  if (error || !data) {
    return { perfectCurrent: 0, momentumCurrent: 0 };
  }

  // Build DayRecord array including not_scheduled days
  const records: DayRecord[] = data.map((row) => ({
    date: row.date,
    status: row.status,
  }));

  const result = calculateStreaks(records);
  return {
    perfectCurrent: result.perfectCurrent,
    momentumCurrent: result.momentumCurrent,
  };
}

export async function fetchMonthLogs(
  habitId: string,
  year: number,
  month: number,
): Promise<HabitLog[]> {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', TEST_USER_ID)
    .gte('date', firstDay)
    .lte('date', lastDayStr)
    .order('date', { ascending: true });

  if (error) {
    console.error('fetchMonthLogs:', error);
    return [];
  }

  return data ?? [];
}

export async function fetchAllLogs(userId: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    console.error('fetchAllLogs:', error);
    return [];
  }

  return data ?? [];
}
