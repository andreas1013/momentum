import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

type ActiveHabit = {
  id: string;
  name: string;
  schedule: string;
  reminder: string;
  tinyVersion: string;
  perfectStreak: number;
  momentumStreak: number;
};

type PausedHabit = {
  id: string;
  name: string;
  schedule: string;
  tinyVersion: string;
};

const ACTIVE_HABITS: ActiveHabit[] = [
  {
    id: 'walk',
    name: 'Walk',
    schedule: 'Weekdays',
    reminder: '7:00 am',
    tinyVersion: 'Walk for 3 minutes',
    perfectStreak: 5,
    momentumStreak: 5,
  },
  {
    id: 'read',
    name: 'Read',
    schedule: 'Every day',
    reminder: '8:00 pm',
    tinyVersion: 'Read one page',
    perfectStreak: 3,
    momentumStreak: 3,
  },
  {
    id: 'drink-water',
    name: 'Drink water',
    schedule: 'Every day',
    reminder: '8:00 am',
    tinyVersion: 'Drink one glass',
    perfectStreak: 9,
    momentumStreak: 9,
  },
  {
    id: 'sleep',
    name: 'Sleep by 10pm',
    schedule: 'Every day',
    reminder: '9:30 pm',
    tinyVersion: 'In bed by 10:30pm',
    perfectStreak: 2,
    momentumStreak: 7,
  },
];

const PAUSED_HABITS: PausedHabit[] = [
  {
    id: 'meditate',
    name: 'Meditate',
    schedule: 'Every day',
    tinyVersion: 'Breathe for 1 minute',
  },
];

type HabitCardProps = {
  habit: ActiveHabit;
  onMenuPress: (habit: ActiveHabit) => void;
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
          <Text style={styles.habitMeta}>
            {habit.schedule} · {habit.reminder}
          </Text>
          <Text style={styles.habitMeta}>Tiny: {habit.tinyVersion}</Text>
          <Text style={styles.habitStreaks}>
            🔥 {habit.perfectStreak} days | ⚡ {habit.momentumStreak} days
          </Text>
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
  habit: PausedHabit;
};

function PausedHabitCard({ habit }: PausedHabitCardProps) {
  return (
    <View style={[styles.habitCard, styles.pausedCard]}>
      <View style={styles.habitCardRow}>
        <View style={styles.habitCardContent}>
          <Text style={styles.habitName}>{habit.name}</Text>
          <Text style={styles.habitMeta}>{habit.schedule}</Text>
          <Text style={styles.habitMeta}>Tiny: {habit.tinyVersion}</Text>
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
  habit: ActiveHabit | null;
  onClose: () => void;
  bottomInset: number;
};

function HabitActionSheet({ habit, onClose, bottomInset }: HabitActionSheetProps) {
  if (!habit) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: bottomInset + Spacing.lg }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{habit.name}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.sheetCloseButton, pressed && styles.menuButtonPressed]}
              hitSlop={Spacing.sm}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <Pressable style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}>
            <Ionicons name="pencil-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.sheetOptionText}>Edit habit</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}>
            <Ionicons name="pause-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.sheetOptionText}>Pause habit</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}>
            <Ionicons name="archive-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.sheetOptionText}>Archive habit</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [sheetHabit, setSheetHabit] = useState<ActiveHabit | null>(null);

  const handleMenuPress = useCallback((habit: ActiveHabit) => {
    setSheetHabit(habit);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetHabit(null);
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Habits</Text>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={() => undefined}>
            <Ionicons name="add" size={26} color={Colors.white} />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Active · 4 habits</Text>
        <View style={styles.cardList}>
          {ACTIVE_HABITS.map((habit) => (
            <ActiveHabitCard key={habit.id} habit={habit} onMenuPress={handleMenuPress} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Paused · 1 habit</Text>
        <View style={styles.cardList}>
          {PAUSED_HABITS.map((habit) => (
            <PausedHabitCard key={habit.id} habit={habit} />
          ))}
        </View>
      </ScrollView>

      <HabitActionSheet
        habit={sheetHabit}
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
  habitCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
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
