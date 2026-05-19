import {
  fetchActiveHabits,
  fetchHabitStreaks,
  fetchTodayLogs,
  signInTestUser,
  upsertHabitLog,
} from '@/lib/habits';
import type { Habit, HabitLog, HabitStatus } from '@/types/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

type UiHabitStatus = HabitStatus | 'pending';

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTodayHeader(date: Date): string {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday}, ${day} ${month}`;
}

function buildOptimisticLog(
  habit: Habit,
  date: string,
  status: 'done' | 'tiny_done',
  existing?: HabitLog,
): HabitLog {
  const now = new Date().toISOString();
  return {
    log_id: existing?.log_id ?? '',
    habit_id: habit.habit_id,
    user_id: habit.user_id,
    date,
    status,
    completed_at: now,
    is_retroactive_edit: false,
    source: 'app',
    notes: existing?.notes ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const todayString = useMemo(() => getLocalDateString(), []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, HabitLog>>({});
  const [streaks, setStreaks] = useState<
    Record<string, { perfectCurrent: number; momentumCurrent: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        await signInTestUser();

        const [habitsData, logsData] = await Promise.all([
          fetchActiveHabits(),
          fetchTodayLogs(todayString),
        ]);

        if (cancelled) return;

        const logsByHabitId = logsData.reduce<Record<string, HabitLog>>((acc, log) => {
          acc[log.habit_id] = log;
          return acc;
        }, {});

        const streakResults = await Promise.all(habitsData.map((h) => fetchHabitStreaks(h)));
        const streaksByHabitId = habitsData.reduce<typeof streaks>((acc, habit, index) => {
          acc[habit.habit_id] = streakResults[index];
          return acc;
        }, {});

        setHabits(habitsData);
        setLogs(logsByHabitId);
        setStreaks(streaksByHabitId);
      } catch {
        if (!cancelled) {
          setError('Failed to load habits');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [todayString]);

  const doneCount = useMemo(
    () =>
      Object.values(logs).filter(
        (log) => log.status === 'done' || log.status === 'tiny_done',
      ).length,
    [logs],
  );

  const totalCount = habits.length;
  const headerDate = useMemo(() => formatTodayHeader(new Date()), []);

  const handleDone = useCallback(
    async (habit: Habit) => {
      const existing = logs[habit.habit_id];
      setLogs((current) => ({
        ...current,
        [habit.habit_id]: buildOptimisticLog(habit, todayString, 'done', existing),
      }));

      const result = await upsertHabitLog({
        habit_id: habit.habit_id,
        date: todayString,
        status: 'done',
      });

      if (result) {
        setLogs((current) => ({
          ...current,
          [habit.habit_id]: result,
        }));
      }
    },
    [logs, todayString],
  );

  const handleTiny = useCallback(
    async (habit: Habit) => {
      const existing = logs[habit.habit_id];
      setLogs((current) => ({
        ...current,
        [habit.habit_id]: buildOptimisticLog(habit, todayString, 'tiny_done', existing),
      }));

      const result = await upsertHabitLog({
        habit_id: habit.habit_id,
        date: todayString,
        status: 'tiny_done',
      });

      if (result) {
        setLogs((current) => ({
          ...current,
          [habit.habit_id]: result,
        }));
      }
    },
    [logs, todayString],
  );

  const renderItem: ListRenderItem<Habit> = useCallback(
    ({ item }) => (
      <HabitCard
        habit={item}
        log={logs[item.habit_id]}
        streak={streaks[item.habit_id]}
        onDone={handleDone}
        onTiny={handleTiny}
      />
    ),
    [logs, streaks, handleDone, handleTiny],
  );

  const keyExtractor = useCallback((item: Habit) => item.habit_id, []);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.done} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.dateHeading}>{headerDate}</Text>
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {doneCount} of {totalCount} habits done
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: totalCount === 0 ? '0%' : `${(doneCount / totalCount) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <FlatList
        data={habits}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

type HabitCardProps = {
  habit: Habit;
  log?: HabitLog;
  streak?: { perfectCurrent: number; momentumCurrent: number };
  onDone: (habit: Habit) => void;
  onTiny: (habit: Habit) => void;
};

function getUiStatus(log?: HabitLog): UiHabitStatus {
  return log?.status ?? 'pending';
}

function HabitCard({ habit, log, streak, onDone, onTiny }: HabitCardProps) {
  const status = getUiStatus(log);
  const isDone = status === 'done';
  const isTiny = status === 'tiny_done';
  const isMissed = status === 'missed';
  const showActions =
    status === 'pending' ||
    status === 'recovered' ||
    status === 'rest_day' ||
    status === 'skipped';

  const cardStyle = [
    styles.card,
    isDone && styles.cardDone,
    isTiny && styles.cardTiny,
    isMissed && styles.cardMissed,
  ];

  const handleDonePress = useCallback(() => {
    onDone(habit);
  }, [habit, onDone]);

  const handleTinyPress = useCallback(() => {
    onTiny(habit);
  }, [habit, onTiny]);

  return (
    <View style={cardStyle}>
      <Text style={styles.habitName}>{habit.name}</Text>
      <Text style={styles.streaks}>
        🔥 {streak?.perfectCurrent ?? 0} days | ⚡ {streak?.momentumCurrent ?? 0} days
      </Text>

      {showActions && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.doneButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleDonePress}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.tinyButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleTinyPress}>
            <Text style={styles.tinyButtonText} numberOfLines={1}>
              {habit.tiny_version}
            </Text>
          </Pressable>
        </View>
      )}

      {isDone && <Text style={styles.completedDone}>✓ Completed</Text>}
      {isTiny && <Text style={styles.completedTiny}>✓ Tiny version done</Text>}
      {isMissed && <Text style={styles.missedLabel}>Missed</Text>}
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
    gap: Spacing.lg,
  },
  dateHeading: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressSection: {
    gap: Spacing.sm,
  },
  progressLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.done,
  },
  errorText: {
    fontSize: 14,
    color: Colors.missed,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardDone: {
    backgroundColor: Colors.doneLight,
    borderColor: Colors.doneLight,
  },
  cardTiny: {
    backgroundColor: Colors.tinyLight,
    borderColor: Colors.tinyLight,
  },
  cardMissed: {
    backgroundColor: Colors.missedLight,
    borderColor: Colors.missedLight,
  },
  habitName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  streaks: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    backgroundColor: Colors.done,
  },
  tinyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.tiny,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  tinyButtonText: {
    color: Colors.tiny,
    fontSize: 15,
    fontWeight: '600',
  },
  completedDone: {
    marginTop: Spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.done,
  },
  completedTiny: {
    marginTop: Spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.tiny,
  },
  missedLabel: {
    marginTop: Spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.missed,
  },
});
