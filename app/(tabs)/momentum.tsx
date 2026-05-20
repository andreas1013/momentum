import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { fetchActiveHabits, fetchMonthLogs, signInTestUser } from '@/lib/habits';
import {
  dismissRecovery,
  fetchMissedHabits,
  getYesterdayDateString,
  logRecovery,
} from '@/lib/recovery';
import { getMonthlyConsistency, isScheduledToday } from '@/lib/streaks';
import type { DayRecord } from '@/lib/streaks';
import type { Habit, HabitLog } from '@/types/database';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const CELL_SIZE = 28;
const CELL_GAP = 4;
const CELL_RADIUS = 6;
const COLUMN_WIDTH = CELL_SIZE + CELL_GAP;
const HABIT_NAME_WIDTH = 90;
const ROW_PERCENT_WIDTH = 44;

type CellStatus =
  | 'done'
  | 'tiny_done'
  | 'recovered'
  | 'missed'
  | 'rest_day'
  | 'skipped'
  | 'not_scheduled'
  | 'future';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getCellStatus(
  habit: Habit,
  day: number,
  year: number,
  month: number,
  logs: HabitLog[],
  today: number,
  currentYear: number,
  currentMonth: number,
): CellStatus {
  const isCurrentMonth = year === currentYear && month === currentMonth;
  const isFuture = isCurrentMonth && day > today;

  const date = new Date(year, month - 1, day);
  const scheduled = isScheduledToday(habit.schedule_type, habit.schedule_days, date);

  if (!scheduled) return 'not_scheduled';
  if (isFuture) return 'future';

  const dateStr = formatDateString(year, month, day);
  const log = logs.find((l) => l.date === dateStr);

  if (!log) return isCurrentMonth && day === today ? 'future' : 'missed';
  return log.status as CellStatus;
}

function isCompletedStatus(status: CellStatus): boolean {
  return status === 'done' || status === 'tiny_done' || status === 'recovered';
}

function buildHabitMonthRecords(
  habit: Habit,
  logs: HabitLog[],
  year: number,
  month: number,
  daysInMonth: number,
  today: number,
  currentYear: number,
  currentMonth: number,
): DayRecord[] {
  const records: DayRecord[] = [];
  const isCurrentMonth = year === currentYear && month === currentMonth;

  for (let day = 1; day <= daysInMonth; day++) {
    if (isCurrentMonth && day > today) continue;

    const date = new Date(year, month - 1, day);
    const scheduled = isScheduledToday(habit.schedule_type, habit.schedule_days, date);
    const dateStr = formatDateString(year, month, day);

    if (!scheduled) {
      records.push({ date: dateStr, status: 'not_scheduled' });
      continue;
    }

    const log = logs.find((l) => l.date === dateStr);
    if (log) {
      records.push({ date: dateStr, status: log.status });
    } else {
      records.push({ date: dateStr, status: 'missed' });
    }
  }

  return records;
}

function getHabitMonthlyPercent(
  habit: Habit,
  logs: HabitLog[],
  year: number,
  month: number,
  daysInMonth: number,
  today: number,
  currentYear: number,
  currentMonth: number,
): number {
  const records = buildHabitMonthRecords(
    habit,
    logs,
    year,
    month,
    daysInMonth,
    today,
    currentYear,
    currentMonth,
  );
  return getMonthlyConsistency(records);
}

function getDailyPercent(
  habits: Habit[],
  monthLogs: Record<string, HabitLog[]>,
  day: number,
  year: number,
  month: number,
  today: number,
  currentYear: number,
  currentMonth: number,
): number | null {
  let scheduled = 0;
  let completed = 0;

  for (const habit of habits) {
    const logs = monthLogs[habit.habit_id] ?? [];
    const status = getCellStatus(habit, day, year, month, logs, today, currentYear, currentMonth);

    if (status === 'not_scheduled') continue;
    if (status === 'future') return null;

    scheduled += 1;
    if (isCompletedStatus(status)) completed += 1;
  }

  if (scheduled === 0) return null;
  return Math.round((completed / scheduled) * 100);
}

function getSummaryTextColor(percent: number): string {
  if (percent >= 80) return Colors.done;
  if (percent >= 50) return Colors.tiny;
  return Colors.textMuted;
}

type GridCellProps = {
  status: CellStatus;
  isToday: boolean;
  onPress?: () => void;
};

function GridCell({ status, isToday, onPress }: GridCellProps) {
  const cell = (
    <View style={[styles.cell, cellStatusStyles[status]]}>
      {status === 'not_scheduled' && <Text style={styles.notScheduledMark}>–</Text>}
    </View>
  );

  const slotStyle = [styles.cellSlot, isToday && styles.todayRing];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [slotStyle, pressed && styles.cellPressed]}
        onPress={onPress}>
        {cell}
      </Pressable>
    );
  }

  return <View style={slotStyle}>{cell}</View>;
}

type MissedDaySelection = {
  habit: Habit;
  date: string;
};

type MissedDaySheetProps = {
  selection: MissedDaySelection;
  bottomInset: number;
  onClose: () => void;
  onTinyRecovery: () => void;
  onDismiss: () => void;
};

function MissedDaySheet({
  selection,
  bottomInset,
  onClose,
  onTinyRecovery,
  onDismiss,
}: MissedDaySheetProps) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <BlurView
          intensity={80}
          tint="light"
          style={[styles.sheet, { paddingBottom: bottomInset + Spacing.lg }]}>
          <Text style={styles.sheetTitle}>{selection.habit.name}</Text>
          <Text style={styles.sheetSubtext}>You missed this day.</Text>
          <Text style={styles.sheetDate}>{formatDisplayDate(selection.date)}</Text>

          <Pressable
            style={({ pressed }) => [styles.sheetPrimaryButton, pressed && styles.buttonPressed]}
            onPress={onTinyRecovery}>
            <Text style={styles.sheetPrimaryButtonText}>Do the tiny version today</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.sheetOutlineButton, pressed && styles.buttonPressed]}
            onPress={onDismiss}>
            <Text style={styles.sheetOutlineButtonText}>Dismiss</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
}

type RecoveryCardProps = {
  missedHabits: Habit[];
  onRecoveryTiny: (habit: Habit) => void;
  onDismiss: (habit: Habit) => void;
  onDismissAll: () => void;
};

function RecoveryCard({ missedHabits, onRecoveryTiny, onDismiss, onDismissAll }: RecoveryCardProps) {
  const isSingle = missedHabits.length === 1;
  const singleHabit = missedHabits[0];
  const firstHabit = missedHabits[0];

  return (
    <View style={styles.recoveryCard}>
      {isSingle ? (
        <>
          <Text style={styles.recoveryTag}>Recovery needed</Text>
          <Text style={styles.recoveryCardTitle}>Keep going with {singleHabit.name}.</Text>
          <Text style={styles.recoveryCardSubtext}>
            You missed yesterday. The tiny version keeps your momentum alive.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.recoveryCardPrimary, pressed && styles.buttonPressed]}
            onPress={() => onRecoveryTiny(singleHabit)}>
            <Text style={styles.recoveryCardPrimaryText} numberOfLines={2}>
              {singleHabit.tiny_version}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.recoveryCardOutline, pressed && styles.buttonPressed]}
            onPress={() => onDismiss(singleHabit)}>
            <Text style={styles.recoveryCardOutlineText}>Continue today</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.recoveryCardOutline, pressed && styles.buttonPressed]}
            onPress={() => undefined}>
            <Text style={styles.recoveryCardOutlineText}>Adjust habit</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.recoveryCardTitle}>A few habits need attention.</Text>
          <Text style={styles.recoveryCardSubtext}>
            You missed {missedHabits.length} habits yesterday. Choose one small action.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.recoveryCardPrimary, pressed && styles.buttonPressed]}
            onPress={() => onRecoveryTiny(firstHabit)}>
            <Text style={styles.recoveryCardPrimaryText}>
              Start with {firstHabit.name}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.recoveryCardOutline, pressed && styles.buttonPressed]}
            onPress={onDismissAll}>
            <Text style={styles.recoveryCardOutlineText}>Dismiss</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const cellStatusStyles = StyleSheet.create({
  done: {
    backgroundColor: Colors.done,
  },
  tiny_done: {
    backgroundColor: Colors.tiny,
  },
  recovered: {
    backgroundColor: Colors.momentum,
  },
  missed: {
    backgroundColor: Colors.missedLight,
    borderWidth: 1,
    borderColor: Colors.missed,
  },
  rest_day: {
    backgroundColor: Colors.restLight,
  },
  skipped: {
    backgroundColor: Colors.skipLight,
  },
  not_scheduled: {
    backgroundColor: 'transparent',
  },
  future: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

export default function MomentumScreen() {
  const insets = useSafeAreaInsets();
  const gridScrollRef = useRef<ScrollView>(null);
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = now.getDate();

  const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [monthLogs, setMonthLogs] = useState<Record<string, HabitLog[]>>({});
  const [missedHabits, setMissedHabits] = useState<Habit[]>([]);
  const [selectedMissedCell, setSelectedMissedCell] = useState<MissedDaySelection | null>(null);
  const [loading, setLoading] = useState(true);
  const yesterday = useMemo(() => getYesterdayDateString(), []);
  const todayString = useMemo(
    () => formatDateString(currentYear, currentMonth, today),
    [currentYear, currentMonth, today],
  );

  const daysInMonth = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );

  const isViewingCurrentMonth = viewYear === currentYear && viewMonth === currentMonth;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);

      await signInTestUser();

      const habitsData = await fetchActiveHabits();
      if (cancelled) return;

      const [logsResults, missed] = await Promise.all([
        Promise.all(habitsData.map((habit) => fetchMonthLogs(habit.habit_id, viewYear, viewMonth))),
        fetchMissedHabits(habitsData),
      ]);

      const logsByHabitId = habitsData.reduce<Record<string, HabitLog[]>>((acc, habit, index) => {
        acc[habit.habit_id] = logsResults[index];
        return acc;
      }, {});

      if (cancelled) return;

      setHabits(habitsData);
      setMonthLogs(logsByHabitId);
      setMissedHabits(missed);
      setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth]);

  const scrollToToday = useCallback(() => {
    if (!isViewingCurrentMonth) return;

    const offset = Math.max(0, (today - 1) * COLUMN_WIDTH - COLUMN_WIDTH * 2);
    gridScrollRef.current?.scrollTo({ x: offset, animated: false });
  }, [isViewingCurrentMonth, today]);

  useEffect(() => {
    if (loading) return;

    const frame = requestAnimationFrame(scrollToToday);
    return () => cancelAnimationFrame(frame);
  }, [scrollToToday, viewYear, viewMonth, loading]);

  const goToPreviousMonth = useCallback(() => {
    setViewMonth((month) => {
      if (month === 1) {
        setViewYear((year) => year - 1);
        return 12;
      }
      return month - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((month) => {
      if (month === 12) {
        setViewYear((year) => year + 1);
        return 1;
      }
      return month + 1;
    });
  }, []);

  const removeHabitFromMissed = useCallback((habitId: string) => {
    setMissedHabits((current) => current.filter((habit) => habit.habit_id !== habitId));
  }, []);

  const applyRecoveredToMonthLogs = useCallback(
    (habit: Habit) => {
      const now = new Date().toISOString();
      setMonthLogs((current) => {
        const habitLogs = current[habit.habit_id] ?? [];
        const existingIndex = habitLogs.findIndex((log) => log.date === todayString);
        const recoveredLog: HabitLog = {
          log_id: existingIndex >= 0 ? habitLogs[existingIndex].log_id : '',
          habit_id: habit.habit_id,
          user_id: habit.user_id,
          date: todayString,
          status: 'recovered',
          completed_at: null,
          is_retroactive_edit: false,
          source: 'app',
          notes: existingIndex >= 0 ? habitLogs[existingIndex].notes : null,
          created_at: existingIndex >= 0 ? habitLogs[existingIndex].created_at : now,
          updated_at: now,
        };

        const nextLogs =
          existingIndex >= 0
            ? habitLogs.map((log, index) => (index === existingIndex ? recoveredLog : log))
            : [...habitLogs, recoveredLog];

        return { ...current, [habit.habit_id]: nextLogs };
      });
    },
    [todayString],
  );

  const handleRecoveryTiny = useCallback(
    async (habit: Habit, missedDate: string = yesterday) => {
      const success = await logRecovery({
        habit,
        missedDate,
        recoveryType: 'tiny_version',
      });
      if (success) {
        removeHabitFromMissed(habit.habit_id);
        applyRecoveredToMonthLogs(habit);
      }
      return success;
    },
    [yesterday, removeHabitFromMissed, applyRecoveredToMonthLogs],
  );

  const handleDismissRecovery = useCallback(
    async (habit: Habit, missedDate: string = yesterday) => {
      await dismissRecovery({ habit, missedDate });
      removeHabitFromMissed(habit.habit_id);
    },
    [yesterday, removeHabitFromMissed],
  );

  const handleDismissAllRecovery = useCallback(async () => {
    await Promise.all(
      missedHabits.map((habit) => dismissRecovery({ habit, missedDate: yesterday })),
    );
    setMissedHabits([]);
  }, [missedHabits, yesterday]);

  const handleMissedCellPress = useCallback((habit: Habit, day: number) => {
    setSelectedMissedCell({
      habit,
      date: formatDateString(viewYear, viewMonth, day),
    });
  }, [viewYear, viewMonth]);

  const handleSheetTinyRecovery = useCallback(async () => {
    if (!selectedMissedCell) return;

    const success = await handleRecoveryTiny(
      selectedMissedCell.habit,
      selectedMissedCell.date,
    );
    if (success) {
      setSelectedMissedCell(null);
    }
  }, [selectedMissedCell, handleRecoveryTiny]);

  const handleSheetDismiss = useCallback(async () => {
    if (!selectedMissedCell) return;

    await dismissRecovery({
      habit: selectedMissedCell.habit,
      missedDate: selectedMissedCell.date,
    });
    setSelectedMissedCell(null);
  }, [selectedMissedCell]);

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
        <View style={styles.monthHeader}>
          <Pressable
            onPress={goToPreviousMonth}
            style={({ pressed }) => [styles.monthArrow, pressed && styles.monthArrowPressed]}
            hitSlop={Spacing.sm}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back' }}
              size={22}
              tintColor={Colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthYear(viewYear, viewMonth)}</Text>
          <Pressable
            onPress={goToNextMonth}
            style={({ pressed }) => [styles.monthArrow, pressed && styles.monthArrowPressed]}
            hitSlop={Spacing.sm}>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'arrow_forward' }}
              size={22}
              tintColor={Colors.textPrimary}
            />
          </Pressable>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.fixedLeftColumn}>
            {habits.map((habit) => (
              <View key={habit.habit_id} style={styles.labelRow}>
                <Text style={styles.habitName} numberOfLines={1} ellipsizeMode="tail">
                  {habit.name}
                </Text>
              </View>
            ))}
            <View style={styles.labelRow}>
              <Text style={styles.summaryRowLabel}>Daily</Text>
            </View>
          </View>

          <ScrollView
            ref={gridScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.daysScroll}>
            <View style={styles.scrollableContent}>
              {habits.map((habit) => {
                const logs = monthLogs[habit.habit_id] ?? [];
                return (
                  <View key={habit.habit_id} style={styles.daysRow}>
                    {days.map((day) => {
                      const status = getCellStatus(
                        habit,
                        day,
                        viewYear,
                        viewMonth,
                        logs,
                        today,
                        currentYear,
                        currentMonth,
                      );
                      return (
                        <GridCell
                          key={`${habit.habit_id}-${day}`}
                          status={status}
                          isToday={isViewingCurrentMonth && day === today}
                          onPress={
                            status === 'missed'
                              ? () => handleMissedCellPress(habit, day)
                              : undefined
                          }
                        />
                      );
                    })}
                  </View>
                );
              })}

              <View style={styles.daysRow}>
                {days.map((day) => {
                  const percent = getDailyPercent(
                    habits,
                    monthLogs,
                    day,
                    viewYear,
                    viewMonth,
                    today,
                    currentYear,
                    currentMonth,
                  );
                  return (
                    <View key={`summary-${day}`} style={styles.summaryCell}>
                      {percent !== null ? (
                        <Text style={[styles.summaryText, { color: getSummaryTextColor(percent) }]}>
                          {percent}%
                        </Text>
                      ) : (
                        <Text style={styles.summaryPlaceholder}>–</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.fixedRightColumn}>
            {habits.map((habit) => {
              const logs = monthLogs[habit.habit_id] ?? [];
              const percent = getHabitMonthlyPercent(
                habit,
                logs,
                viewYear,
                viewMonth,
                daysInMonth,
                today,
                currentYear,
                currentMonth,
              );
              return (
                <View key={`${habit.habit_id}-percent`} style={styles.labelRow}>
                  <Text style={styles.rowPercent}>
                    {Number.isInteger(percent) ? percent : percent.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
            <View style={styles.labelRow} />
          </View>
        </View>

        {missedHabits.length > 0 ? (
          <RecoveryCard
            missedHabits={missedHabits}
            onRecoveryTiny={(habit) => handleRecoveryTiny(habit)}
            onDismiss={(habit) => handleDismissRecovery(habit)}
            onDismissAll={handleDismissAllRecovery}
          />
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>9 days ⚡</Text>
            <Text style={styles.statLabel}>Momentum streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>5 days 🔥</Text>
            <Text style={styles.statLabel}>Perfect streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>83%</Text>
            <Text style={styles.statLabel}>This month</Text>
          </View>
        </View>
      </ScrollView>

      {selectedMissedCell ? (
        <MissedDaySheet
          selection={selectedMissedCell}
          bottomInset={insets.bottom}
          onClose={() => setSelectedMissedCell(null)}
          onTinyRecovery={handleSheetTinyRecovery}
          onDismiss={handleSheetDismiss}
        />
      ) : null}
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthArrowPressed: {
    opacity: 0.85,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  fixedLeftColumn: {
    width: HABIT_NAME_WIDTH,
    marginRight: Spacing.sm,
  },
  fixedRightColumn: {
    width: ROW_PERCENT_WIDTH,
    marginLeft: Spacing.sm,
    alignItems: 'flex-end',
  },
  labelRow: {
    height: CELL_SIZE,
    marginBottom: CELL_GAP,
    justifyContent: 'center',
  },
  habitName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  summaryRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  daysScroll: {
    flex: 1,
  },
  scrollableContent: {
    paddingLeft: 8,
    paddingRight: Spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: CELL_GAP,
  },
  cellSlot: {
    width: COLUMN_WIDTH,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: Colors.done,
    borderRadius: CELL_RADIUS + 2,
  },
  notScheduledMark: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  summaryCell: {
    width: COLUMN_WIDTH,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryPlaceholder: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  rowPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cellPressed: {
    opacity: 0.85,
  },
  recoveryCard: {
    ...Shadows.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderLeftWidth: 4,
    borderLeftColor: Colors.momentum,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  recoveryTag: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.momentum,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recoveryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recoveryCardSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  recoveryCardPrimary: {
    backgroundColor: Colors.momentum,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  recoveryCardPrimaryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  recoveryCardOutline: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  recoveryCardOutlineText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 24, 20, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sheetSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  sheetDate: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  sheetPrimaryButton: {
    backgroundColor: Colors.momentum,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  sheetPrimaryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  sheetOutlineButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  sheetOutlineButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  statCard: {
    ...Shadows.card,
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
