import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const CELL_SIZE = 28;
const CELL_GAP = 4;
const CELL_RADIUS = 6;
const COLUMN_WIDTH = CELL_SIZE + CELL_GAP;
const HABIT_NAME_WIDTH = 90;
const ROW_PERCENT_WIDTH = 44;
const TODAY_DAY = 18;
const TODAY_YEAR = 2026;
const TODAY_MONTH = 5; // May (1-indexed)

type CellStatus =
  | 'done'
  | 'tiny_done'
  | 'recovered'
  | 'missed'
  | 'rest_day'
  | 'not_scheduled'
  | 'future';

type HabitMonthData = {
  id: string;
  name: string;
  cells: Record<number, CellStatus>;
};

const HABIT_NAMES = ['Walk', 'Read', 'Drink water', 'Sleep by 10pm'] as const;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

function buildWalkMay2026(): Record<number, CellStatus> {
  const cells: Record<number, CellStatus> = {};
  let weekdayIndex = 0;

  for (let day = 1; day <= 31; day++) {
    if (day === 17) {
      cells[day] = 'missed';
      continue;
    }

    if (isWeekend(TODAY_YEAR, TODAY_MONTH, day)) {
      cells[day] = 'not_scheduled';
      continue;
    }

    if (day <= 16) {
      cells[day] = weekdayIndex % 4 < 3 ? 'done' : 'tiny_done';
      weekdayIndex += 1;
    } else {
      cells[day] = 'future';
    }
  }

  return cells;
}

function buildReadMay2026(): Record<number, CellStatus> {
  const cells: Record<number, CellStatus> = {};
  for (let day = 1; day <= 31; day++) {
    if (day <= 15) cells[day] = 'done';
    else if (day === 16) cells[day] = 'tiny_done';
    else if (day === 17) cells[day] = 'missed';
    else cells[day] = 'future';
  }
  return cells;
}

function buildDrinkWaterMay2026(): Record<number, CellStatus> {
  const cells: Record<number, CellStatus> = {};
  for (let day = 1; day <= 31; day++) {
    if (day <= 17) cells[day] = 'done';
    else cells[day] = 'future';
  }
  return cells;
}

function buildSleepMay2026(): Record<number, CellStatus> {
  const cells: Record<number, CellStatus> = {};
  for (let day = 1; day <= 31; day++) {
    if (day <= 5) cells[day] = 'done';
    else if (day === 6) cells[day] = 'missed';
    else if (day <= 14) cells[day] = 'done';
    else if (day === 15) cells[day] = 'tiny_done';
    else if (day <= 17) cells[day] = 'done';
    else cells[day] = 'future';
  }
  return cells;
}

function buildMay2026Habits(): HabitMonthData[] {
  return [
    { id: 'walk', name: 'Walk', cells: buildWalkMay2026() },
    { id: 'read', name: 'Read', cells: buildReadMay2026() },
    { id: 'drink-water', name: 'Drink water', cells: buildDrinkWaterMay2026() },
    { id: 'sleep', name: 'Sleep by 10pm', cells: buildSleepMay2026() },
  ];
}

function buildEmptyMonthHabits(
  year: number,
  month: number,
  daysInMonth: number,
): HabitMonthData[] {
  return HABIT_NAMES.map((name, index) => {
    const cells: Record<number, CellStatus> = {};
    const isWalk = index === 0;

    for (let day = 1; day <= daysInMonth; day++) {
      if (isWalk && isWeekend(year, month, day)) {
        cells[day] = 'not_scheduled';
      } else {
        cells[day] = 'future';
      }
    }

    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      cells,
    };
  });
}

function getHabitsForMonth(year: number, month: number): HabitMonthData[] {
  if (year === TODAY_YEAR && month === TODAY_MONTH) {
    return buildMay2026Habits();
  }
  return buildEmptyMonthHabits(year, month, getDaysInMonth(year, month));
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function isCompletedStatus(status: CellStatus): boolean {
  return status === 'done' || status === 'tiny_done' || status === 'recovered';
}

function getHabitMonthlyPercent(
  cells: Record<number, CellStatus>,
  daysInMonth: number,
): number {
  let scheduled = 0;
  let completed = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const status = cells[day];
    if (!status || status === 'not_scheduled' || status === 'future') continue;
    scheduled += 1;
    if (isCompletedStatus(status)) completed += 1;
  }

  if (scheduled === 0) return 0;
  return Math.round((completed / scheduled) * 100);
}

function getDailyPercent(
  habits: HabitMonthData[],
  day: number,
): number | null {
  let scheduled = 0;
  let completed = 0;

  for (const habit of habits) {
    const status = habit.cells[day];
    if (!status || status === 'not_scheduled') continue;
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
};

function GridCell({ status, isToday }: GridCellProps) {
  const cell = (
    <View style={[styles.cell, cellStatusStyles[status]]}>
      {status === 'not_scheduled' && <Text style={styles.notScheduledMark}>–</Text>}
    </View>
  );

  if (!isToday) return <View style={styles.cellSlot}>{cell}</View>;

  return <View style={[styles.cellSlot, styles.todayRing]}>{cell}</View>;
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
  const [viewYear, setViewYear] = useState(TODAY_YEAR);
  const [viewMonth, setViewMonth] = useState(TODAY_MONTH);

  const daysInMonth = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const habits = useMemo(
    () => getHabitsForMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );

  const isViewingCurrentMonth = viewYear === TODAY_YEAR && viewMonth === TODAY_MONTH;

  const scrollToToday = useCallback(() => {
    if (!isViewingCurrentMonth) return;

    const offset = Math.max(0, (TODAY_DAY - 1) * COLUMN_WIDTH - COLUMN_WIDTH * 2);
    gridScrollRef.current?.scrollTo({ x: offset, animated: false });
  }, [isViewingCurrentMonth]);

  useEffect(() => {
    const frame = requestAnimationFrame(scrollToToday);
    return () => cancelAnimationFrame(frame);
  }, [scrollToToday, viewYear, viewMonth]);

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
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonthYear(viewYear, viewMonth)}</Text>
        <Pressable
          onPress={goToNextMonth}
          style={({ pressed }) => [styles.monthArrow, pressed && styles.monthArrowPressed]}
          hitSlop={Spacing.sm}>
          <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.fixedLeftColumn}>
          {habits.map((habit) => (
            <View key={habit.id} style={styles.labelRow}>
              <Text
                style={styles.habitName}
                numberOfLines={1}
                ellipsizeMode="tail">
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
            {habits.map((habit) => (
              <View key={habit.id} style={styles.daysRow}>
                {days.map((day) => (
                  <GridCell
                    key={`${habit.id}-${day}`}
                    status={habit.cells[day] ?? 'future'}
                    isToday={isViewingCurrentMonth && day === TODAY_DAY}
                  />
                ))}
              </View>
            ))}

            <View style={styles.daysRow}>
              {days.map((day) => {
                const percent = getDailyPercent(habits, day);
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
          {habits.map((habit) => (
            <View key={`${habit.id}-percent`} style={styles.labelRow}>
              <Text style={styles.rowPercent}>
                {getHabitMonthlyPercent(habit.cells, daysInMonth)}%
              </Text>
            </View>
          ))}
          <View style={styles.labelRow} />
        </View>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
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
