import {
  fetchActiveHabits,
  fetchHabitStreaks,
  fetchTodayLogs,
  signInTestUser,
  upsertHabitLog,
} from '@/lib/habits';
import {
  dismissRecovery,
  fetchMissedHabits,
  fetchRepeatedMissHabits,
  getYesterdayDateString,
  logRecovery,
} from '@/lib/recovery';
import type { Habit, HabitLog, HabitStatus } from '@/types/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

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
  const [missedHabits, setMissedHabits] = useState<Habit[]>([]);
  const [repeatedMissHabits, setRepeatedMissHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Habit>>(null);
  const yesterday = useMemo(() => getYesterdayDateString(), []);

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

        const [streakResults, missed, repeated] = await Promise.all([
          Promise.all(habitsData.map((h) => fetchHabitStreaks(h))),
          fetchMissedHabits(habitsData),
          fetchRepeatedMissHabits(habitsData),
        ]);

        const streaksByHabitId = habitsData.reduce<typeof streaks>((acc, habit, index) => {
          acc[habit.habit_id] = streakResults[index];
          return acc;
        }, {});

        setHabits(habitsData);
        setLogs(logsByHabitId);
        setStreaks(streaksByHabitId);
        setMissedHabits(missed);
        setRepeatedMissHabits(repeated);
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

  const removeHabitFromRecovery = useCallback((habitId: string) => {
    setMissedHabits((current) => current.filter((habit) => habit.habit_id !== habitId));
    setRepeatedMissHabits((current) => current.filter((habit) => habit.habit_id !== habitId));
  }, []);

  const applyRecoveredLog = useCallback(
    (habit: Habit) => {
      const now = new Date().toISOString();
      setLogs((current) => ({
        ...current,
        [habit.habit_id]: {
          log_id: current[habit.habit_id]?.log_id ?? '',
          habit_id: habit.habit_id,
          user_id: habit.user_id,
          date: todayString,
          status: 'recovered',
          completed_at: null,
          is_retroactive_edit: false,
          source: 'app',
          notes: current[habit.habit_id]?.notes ?? null,
          created_at: current[habit.habit_id]?.created_at ?? now,
          updated_at: now,
        },
      }));
    },
    [todayString],
  );

  const handleRecoveryTiny = useCallback(
    async (habit: Habit) => {
      const success = await logRecovery({
        habit,
        missedDate: yesterday,
        recoveryType: 'tiny_version',
      });
      if (success) {
        removeHabitFromRecovery(habit.habit_id);
        applyRecoveredLog(habit);
      }
    },
    [yesterday, removeHabitFromRecovery, applyRecoveredLog],
  );

  const handleDismissRecovery = useCallback(
    async (habit: Habit) => {
      await dismissRecovery({ habit, missedDate: yesterday });
      removeHabitFromRecovery(habit.habit_id);
    },
    [yesterday, removeHabitFromRecovery],
  );

  const handleDismissAllRecovery = useCallback(async () => {
    await Promise.all(
      missedHabits.map((habit) => dismissRecovery({ habit, missedDate: yesterday })),
    );
    setMissedHabits([]);
    setRepeatedMissHabits([]);
  }, [missedHabits, yesterday]);

  const handleSeeMissedHabits = useCallback(() => {
    const index = habits.findIndex((habit) => {
      const status = logs[habit.habit_id]?.status;
      return status !== 'done' && status !== 'tiny_done' && status !== 'recovered';
    });
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [habits, logs]);

  const visibleRepeatedMiss = useMemo(
    () =>
      repeatedMissHabits.filter((habit) =>
        missedHabits.some((missed) => missed.habit_id === habit.habit_id),
      ),
    [repeatedMissHabits, missedHabits],
  );

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

      {missedHabits.length > 0 ? (
        <RecoveryBanner
          missedHabits={missedHabits}
          repeatedMissHabits={visibleRepeatedMiss}
          onRecoveryTiny={handleRecoveryTiny}
          onDismiss={handleDismissRecovery}
          onDismissAll={handleDismissAllRecovery}
          onSeeMissedHabits={handleSeeMissedHabits}
        />
      ) : null}

      <FlatList
        ref={listRef}
        data={habits}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => undefined}
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

type RecoveryBannerProps = {
  missedHabits: Habit[];
  repeatedMissHabits: Habit[];
  onRecoveryTiny: (habit: Habit) => void;
  onDismiss: (habit: Habit) => void;
  onDismissAll: () => void;
  onSeeMissedHabits: () => void;
};

function RecoveryBanner({
  missedHabits,
  repeatedMissHabits,
  onRecoveryTiny,
  onDismiss,
  onDismissAll,
  onSeeMissedHabits,
}: RecoveryBannerProps) {
  const isSingle = missedHabits.length === 1;
  const singleHabit = missedHabits[0];

  return (
    <View style={styles.recoveryBannerContainer}>
      <View style={styles.recoveryBanner}>
        {isSingle ? (
          <>
            <Text style={styles.recoveryTitle}>Keep your momentum</Text>
            <Text style={styles.recoveryText}>
              You missed {singleHabit.name} yesterday. The tiny version keeps your streak alive.
            </Text>
            <View style={styles.recoveryActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.recoveryPrimaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => onRecoveryTiny(singleHabit)}>
                <Text style={styles.recoveryPrimaryButtonText} numberOfLines={1}>
                  {singleHabit.tiny_version}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.recoveryGhostButton, pressed && styles.buttonPressed]}
                onPress={() => onDismiss(singleHabit)}>
                <Text style={styles.recoveryGhostButtonText}>Dismiss</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.recoveryTitle}>A few habits need attention</Text>
            <Text style={styles.recoveryText}>
              You missed {missedHabits.length} habits yesterday. Start with one small action.
            </Text>
            <View style={styles.recoveryActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.recoveryPrimaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onSeeMissedHabits}>
                <Text style={styles.recoveryPrimaryButtonText}>See missed habits</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.recoveryGhostButton, pressed && styles.buttonPressed]}
                onPress={onDismissAll}>
                <Text style={styles.recoveryGhostButtonText}>Dismiss all</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {repeatedMissHabits.map((habit) => (
        <View key={habit.habit_id} style={styles.repeatedMissBanner}>
          <Text style={styles.recoveryText}>
            {habit.name} has been missed 2 days in a row. Want to make it easier?
          </Text>
          <View style={styles.recoveryActions}>
            <Pressable
              style={({ pressed }) => [styles.recoveryGhostButton, pressed && styles.buttonPressed]}
              onPress={() => undefined}>
              <Text style={styles.recoveryGhostButtonText}>Make it smaller</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.recoveryGhostButton, pressed && styles.buttonPressed]}
              onPress={() => onDismiss(habit)}>
              <Text style={styles.recoveryGhostButtonText}>Keep as is</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

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
    ...Shadows.card,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    backgroundColor: Colors.done,
    borderRadius: Radius.pill,
    paddingVertical: 17,
  },
  tinyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.tiny,
    borderRadius: Radius.pill,
    paddingVertical: 17,
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
  recoveryBannerContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  recoveryBanner: {
    backgroundColor: Colors.momentumLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.momentum,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  repeatedMissBanner: {
    backgroundColor: Colors.missedLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recoveryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  recoveryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  recoveryPrimaryButton: {
    flex: 1,
    backgroundColor: Colors.momentum,
    borderRadius: Radius.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryPrimaryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  recoveryGhostButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  recoveryGhostButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
