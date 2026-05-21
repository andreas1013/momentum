import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { fetchActiveHabits, signInTestUser } from '@/lib/habits';
import type { Habit, ScheduleType } from '@/types/database';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

function formatScheduleLabel(scheduleType: ScheduleType): string {
  switch (scheduleType) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays';
    case 'weekends':
      return 'Weekends';
    case 'custom':
      return 'Custom schedule';
  }
}

type HabitCardProps = {
  habit: Habit;
  onMenuPress: (habit: Habit) => void;
};

function ActiveHabitCard({ habit, onMenuPress }: HabitCardProps) {
  const handleMenuPress = useCallback(() => {
    onMenuPress(habit);
  }, [habit, onMenuPress]);

  return (
    <View style={styles.habitCard}>
      <View style={styles.habitCardRow}>
        <View style={styles.habitCardContent}>
          <Text style={styles.habitName}>{habit.name}</Text>
          <Text style={styles.habitMeta}>{formatScheduleLabel(habit.schedule_type)}</Text>
          <Text style={styles.habitMeta}>Tiny: {habit.tiny_version}</Text>
          <Text style={styles.habitStreaks}>🔥 0 days ⚡ 0 days</Text>
        </View>
        <Pressable
          onPress={handleMenuPress}
          style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
          hitSlop={Spacing.sm}>
          <Text style={styles.menuButtonText}>···</Text>
        </Pressable>
      </View>
    </View>
  );
}

type PausedHabitCardProps = {
  habit: Habit;
};

function PausedHabitCard({ habit }: PausedHabitCardProps) {
  return (
    <View style={[styles.habitCard, styles.pausedCard]}>
      <View style={styles.habitCardRow}>
        <View style={styles.habitCardContent}>
          <Text style={styles.habitName}>{habit.name}</Text>
          <Text style={styles.habitMeta}>{formatScheduleLabel(habit.schedule_type)}</Text>
          <Text style={styles.habitMeta}>Tiny: {habit.tiny_version}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.resumeButton, pressed && styles.resumeButtonPressed]}>
          <Text style={styles.resumeButtonText}>Resume</Text>
        </Pressable>
      </View>
    </View>
  );
}

type HabitActionSheetProps = {
  habit: Habit | null;
  onClose: () => void;
  bottomInset: number;
};

function HabitActionSheet({ habit, onClose, bottomInset }: HabitActionSheetProps) {
  if (!habit) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BlurView
          intensity={80}
          tint="light"
          style={[styles.sheet, { paddingBottom: bottomInset + Spacing.lg }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{habit.name}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.sheetCloseButton, pressed && styles.menuButtonPressed]}
              hitSlop={Spacing.sm}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close' }}
                size={22}
                tintColor={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}>
            <SymbolView
              name={{ ios: 'pencil', android: 'edit' }}
              size={20}
              tintColor={Colors.textPrimary}
            />
            <Text style={styles.sheetOptionText}>Edit habit</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}>
            <SymbolView
              name={{ ios: 'pause.circle', android: 'pause_circle' }}
              size={20}
              tintColor={Colors.textPrimary}
            />
            <Text style={styles.sheetOptionText}>Pause habit</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}>
            <SymbolView
              name={{ ios: 'archivebox', android: 'archive' }}
              size={20}
              tintColor={Colors.textPrimary}
            />
            <Text style={styles.sheetOptionText}>Archive habit</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
}

export default function HabitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  async function loadData() {
    setLoading(true);
    await signInTestUser();

    const habitsData = await fetchActiveHabits();

    setHabits(habitsData);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.status === 'active'),
    [habits],
  );

  const pausedHabits = useMemo(
    () => habits.filter((habit) => habit.status === 'paused'),
    [habits],
  );

  const handleMenuPress = useCallback((habit: Habit) => {
    setSelectedHabit(habit);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedHabit(null);
  }, []);

  const renderActiveItem: ListRenderItem<Habit> = useCallback(
    ({ item }) => <ActiveHabitCard habit={item} onMenuPress={handleMenuPress} />,
    [handleMenuPress],
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
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Habits</Text>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={() => router.push('/create-habit')}>
            <Ionicons name="add" size={26} color={Colors.white} />
          </Pressable>
        </View>

        {activeHabits.length === 0 ? (
          <Text style={styles.emptyStateText}>No habits yet. Tap + to create your first habit.</Text>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Active · {activeHabits.length} habits</Text>
            <FlatList
              data={activeHabits}
              keyExtractor={keyExtractor}
              renderItem={renderActiveItem}
              scrollEnabled={false}
              contentContainerStyle={styles.cardList}
            />
          </>
        )}

        {pausedHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              Paused · {pausedHabits.length} {pausedHabits.length === 1 ? 'habit' : 'habits'}
            </Text>
            <View style={styles.cardList}>
              {pausedHabits.map((habit) => (
                <PausedHabitCard key={habit.habit_id} habit={habit} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <HabitActionSheet
        habit={selectedHabit}
        onClose={handleCloseSheet}
        bottomInset={insets.bottom}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cardList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  habitCard: {
    ...Shadows.card,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  pausedCard: {
    opacity: 0.5,
  },
  habitCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  habitCardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  habitName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  habitMeta: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  habitStreaks: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  menuButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  menuButtonPressed: {
    opacity: 0.7,
  },
  menuButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textMuted,
    lineHeight: 22,
  },
  resumeButton: {
    borderWidth: 1,
    borderColor: Colors.done,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'center',
  },
  resumeButtonPressed: {
    opacity: 0.85,
  },
  resumeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.done,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.textPrimary,
    opacity: 0.4,
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  sheetCloseButton: {
    padding: Spacing.xs,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetOptionPressed: {
    opacity: 0.7,
  },
  sheetOptionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
