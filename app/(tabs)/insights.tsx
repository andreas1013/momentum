import {
  fetchActiveHabits,
  fetchAllLogs,
  signInTestUser,
} from '@/lib/habits';
import { calculateStreaks, type DayRecord } from '@/lib/streaks';
import type { Habit, HabitLog, HabitStatus } from '@/types/database';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const TEST_USER_ID = '3f550a2e-613e-4fa4-93ed-b0180ab5f7b2';
const BAR_CHART_MAX_HEIGHT = 120;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type StatCardProps = {
  label: string;
  value: string;
  subtext: string;
  valueColor?: string;
};

type WeeklyBar = {
  day: string;
  value: number;
};

function StatCard({ label, value, subtext, valueColor }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={[styles.statCardValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.statCardSubtext}>{subtext}</Text>
    </View>
  );
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isCompletingStatus(status: HabitStatus): boolean {
  return status === 'done' || status === 'tiny_done' || status === 'recovered';
}

function getLast7DateStrings(from: Date): string[] {
  const dates: string[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(from);
    date.setDate(from.getDate() - offset);
    dates.push(getLocalDateString(date));
  }
  return dates;
}

function formatWeekSubtitle(weekDates: string[]): string {
  if (weekDates.length === 0) return 'This week';

  const first = new Date(`${weekDates[0]}T12:00:00`);
  const last = new Date(`${weekDates[weekDates.length - 1]}T12:00:00`);
  const monthName = first.toLocaleDateString('en-GB', { month: 'long' });

  return `Week of ${first.getDate()}–${last.getDate()} ${monthName}`;
}

function isDateInCurrentMonth(dateStr: string, now: Date): boolean {
  const [year, month] = dateStr.split('-').map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function computeWeeklyBars(
  habits: Habit[],
  logs: HabitLog[],
  weekDates: string[],
): WeeklyBar[] {
  return weekDates.map((dateStr) => {
    const date = new Date(`${dateStr}T12:00:00`);
    const completed = logs.filter(
      (log) => log.date === dateStr && isCompletingStatus(log.status),
    ).length;
    const value =
      habits.length === 0 ? 0 : Math.round((completed / habits.length) * 100);

    return {
      day: DAY_LABELS[date.getDay()],
      value,
    };
  });
}

function computeInsights(habits: Habit[], logs: HabitLog[], now: Date) {
  const weekDates = getLast7DateStrings(now);
  const weekDateSet = new Set(weekDates);
  const habitCount = habits.length;
  const scheduledThisWeek = habitCount * 7;

  const weekLogs = logs.filter((log) => weekDateSet.has(log.date));
  const weekCompleted = weekLogs.filter((log) => isCompletingStatus(log.status)).length;

  const weeklyCompletion =
    scheduledThisWeek === 0
      ? 0
      : Math.round((weekCompleted / scheduledThisWeek) * 100);

  const weeklyBars = computeWeeklyBars(habits, logs, weekDates);

  const daysElapsedThisMonth = now.getDate();
  const monthLogs = logs.filter((log) => isDateInCurrentMonth(log.date, now));

  let strongestHabit = habits[0]?.name ?? '—';
  let strongestWeekPercent = 0;
  let highestMonthScore = -1;

  for (const habit of habits) {
    const habitWeekLogs = weekLogs.filter((log) => log.habit_id === habit.habit_id);
    const habitWeekCompleted = habitWeekLogs.filter((log) =>
      isCompletingStatus(log.status),
    ).length;
    const weekPercent =
      habitCount === 0 ? 0 : Math.round((habitWeekCompleted / 7) * 100);

    const habitMonthCompleted = monthLogs.filter(
      (log) => log.habit_id === habit.habit_id && isCompletingStatus(log.status),
    ).length;
    const monthScore =
      daysElapsedThisMonth === 0 ? 0 : habitMonthCompleted / daysElapsedThisMonth;

    if (monthScore > highestMonthScore) {
      highestMonthScore = monthScore;
      strongestHabit = habit.name;
      strongestWeekPercent = weekPercent;
    }
  }

  let maxMomentumCurrent = 0;
  let maxMomentumBest = 0;

  for (const habit of habits) {
    const habitLogs = logs
      .filter((log) => log.habit_id === habit.habit_id)
      .sort((a, b) => a.date.localeCompare(b.date));

    const records: DayRecord[] = habitLogs.map((log) => ({
      date: log.date,
      status: log.status,
    }));

    const streaks = calculateStreaks(records);
    maxMomentumCurrent = Math.max(maxMomentumCurrent, streaks.momentumCurrent);
    maxMomentumBest = Math.max(maxMomentumBest, streaks.momentumBest);
  }

  const tinyVersionCount = logs.filter((log) => log.status === 'tiny_done').length;

  let needsAttentionHabit = habits[0]?.name ?? '—';
  let missedThisMonth = 0;

  for (const habit of habits) {
    const missedCount = monthLogs.filter(
      (log) => log.habit_id === habit.habit_id && log.status === 'missed',
    ).length;

    if (missedCount > missedThisMonth) {
      missedThisMonth = missedCount;
      needsAttentionHabit = habit.name;
    }
  }

  const dayOfWeekStats = Array.from({ length: 7 }, () => ({
    total: 0,
    completed: 0,
  }));

  for (const log of logs) {
    const dayIndex = new Date(`${log.date}T12:00:00`).getDay();
    dayOfWeekStats[dayIndex].total += 1;
    if (isCompletingStatus(log.status)) {
      dayOfWeekStats[dayIndex].completed += 1;
    }
  }

  let bestDayIndex = 0;
  let bestDayRate = -1;

  dayOfWeekStats.forEach((stats, index) => {
    if (stats.total === 0) return;
    const rate = stats.completed / stats.total;
    if (rate > bestDayRate) {
      bestDayRate = rate;
      bestDayIndex = index;
    }
  });

  const bestDayName = WEEKDAY_NAMES[bestDayIndex];
  const bestDayPercent = bestDayRate < 0 ? 0 : Math.round(bestDayRate * 100);

  return {
    weekDates,
    weeklyCompletion,
    weekCompleted,
    scheduledThisWeek,
    weeklyBars,
    strongestHabit,
    strongestWeekPercent,
    momentumStreakCurrent: maxMomentumCurrent,
    momentumStreakBest: maxMomentumBest,
    tinyVersionCount,
    needsAttentionHabit,
    missedThisMonth,
    bestDayName,
    bestDayPercent,
  };
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      await signInTestUser();

      const [habitsData, logsData] = await Promise.all([
        fetchActiveHabits(),
        fetchAllLogs(TEST_USER_ID),
      ]);

      if (cancelled) return;

      setHabits(habitsData);
      setLogs(logsData);
      setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const insights = useMemo(() => computeInsights(habits, logs, new Date()), [habits, logs]);
  const showInsights = logs.length >= 5;
  const weekSubtitle = formatWeekSubtitle(insights.weekDates);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.done} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>{weekSubtitle}</Text>
        </View>

        {showInsights ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.cardLabel}>Weekly completion</Text>
              <Text style={styles.weeklyValue}>{insights.weeklyCompletion}%</Text>
              <Text style={styles.weeklySubtext}>
                {insights.weekCompleted} of {insights.scheduledThisWeek} scheduled habits
                completed this week
              </Text>

              <View style={styles.barChart}>
                {insights.weeklyBars.map(({ day, value }, index) => (
                  <View key={insights.weekDates[index]} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: (value / 100) * BAR_CHART_MAX_HEIGHT,
                            opacity: value === 100 ? 1 : 0.55,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barDayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.statRow}>
              <StatCard
                label="Strongest habit"
                value={insights.strongestHabit}
                subtext={`${insights.strongestWeekPercent}% this week`}
              />
              <StatCard
                label="Best day"
                value={insights.bestDayName}
                subtext={`${insights.bestDayPercent}% avg on ${insights.bestDayName}s`}
              />
            </View>

            <View style={styles.statRow}>
              <StatCard
                label="Momentum streak"
                value={`${insights.momentumStreakCurrent} ⚡`}
                subtext={`Best ever: ${insights.momentumStreakBest} days`}
              />
              <StatCard
                label="Tiny versions"
                value={String(insights.tinyVersionCount)}
                subtext="Kept momentum going"
              />
            </View>

            <View style={styles.attentionCard}>
              <Text style={styles.cardLabel}>Needs attention</Text>
              <Text style={styles.attentionValue}>{insights.needsAttentionHabit}</Text>
              <Text style={styles.attentionSubtext}>
                Missed {insights.missedThisMonth} times this month. Consider making it smaller.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Insights will appear after a few days of tracking.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  sectionCard: {
    ...Shadows.card,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  weeklyValue: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weeklySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barTrack: {
    height: BAR_CHART_MAX_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '70%',
    maxWidth: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.done,
  },
  barDayLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    ...Shadows.card,
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statCardSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  attentionCard: {
    ...Shadows.card,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  attentionValue: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.missed,
  },
  attentionSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
