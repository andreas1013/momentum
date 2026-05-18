import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const HABIT_COUNT = 4;

type HabitCompletionStatus = 'pending' | 'done' | 'tiny';

type Habit = {
  id: string;
  name: string;
  tinyVersion: string;
  perfectStreak: number;
  momentumStreak: number;
  status: HabitCompletionStatus;
};

const INITIAL_HABITS: Habit[] = [
  {
    id: 'walk',
    name: 'Walk',
    tinyVersion: 'Walk for 3 minutes',
    perfectStreak: 5,
    momentumStreak: 5,
    status: 'pending',
  },
  {
    id: 'read',
    name: 'Read',
    tinyVersion: 'Read one page',
    perfectStreak: 3,
    momentumStreak: 3,
    status: 'pending',
  },
  {
    id: 'drink-water',
    name: 'Drink water',
    tinyVersion: 'Drink one glass',
    perfectStreak: 9,
    momentumStreak: 9,
    status: 'pending',
  },
  {
    id: 'sleep',
    name: 'Sleep by 10pm',
    tinyVersion: 'In bed by 10:30pm',
    perfectStreak: 2,
    momentumStreak: 7,
    status: 'pending',
  },
];

function formatTodayHeader(date: Date): string {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${weekday}, ${day} ${month}`;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

  const doneCount = useMemo(
    () => habits.filter((habit) => habit.status !== 'pending').length,
    [habits],
  );

  const headerDate = useMemo(() => formatTodayHeader(new Date()), []);

  const handleDone = useCallback((id: string) => {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id && habit.status === 'pending' ? { ...habit, status: 'done' } : habit,
      ),
    );
  }, []);

  const handleTiny = useCallback((id: string) => {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id && habit.status === 'pending' ? { ...habit, status: 'tiny' } : habit,
      ),
    );
  }, []);

  const renderItem: ListRenderItem<Habit> = useCallback(
    ({ item }) => (
      <HabitCard habit={item} onDone={handleDone} onTiny={handleTiny} />
    ),
    [handleDone, handleTiny],
  );

  const keyExtractor = useCallback((item: Habit) => item.id, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.dateHeading}>{headerDate}</Text>
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {doneCount} of {HABIT_COUNT} habits done
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(doneCount / HABIT_COUNT) * 100}%` },
              ]}
            />
          </View>
        </View>
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
  onDone: (id: string) => void;
  onTiny: (id: string) => void;
};

function HabitCard({ habit, onDone, onTiny }: HabitCardProps) {
  const isDone = habit.status === 'done';
  const isTiny = habit.status === 'tiny';
  const isPending = habit.status === 'pending';

  const cardStyle = [
    styles.card,
    isDone && styles.cardDone,
    isTiny && styles.cardTiny,
  ];

  return (
    <View style={cardStyle}>
      <Text style={styles.habitName}>{habit.name}</Text>
      <Text style={styles.streaks}>
        🔥 {habit.perfectStreak} · ⚡ {habit.momentumStreak}
      </Text>

      {isPending && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.doneButton, pressed && styles.buttonPressed]}
            onPress={() => onDone(habit.id)}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.tinyButton, pressed && styles.buttonPressed]}
            onPress={() => onTiny(habit.id)}>
            <Text style={styles.tinyButtonText}>Tiny</Text>
          </Pressable>
        </View>
      )}

      {isDone && <Text style={styles.completedDone}>✓ Completed</Text>}
      {isTiny && <Text style={styles.completedTiny}>✓ Tiny version done</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
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
});
