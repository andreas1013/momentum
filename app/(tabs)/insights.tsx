import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const BAR_CHART_MAX_HEIGHT = 120;

const WEEKLY_BARS = [
  { day: 'Mon', value: 100 },
  { day: 'Tue', value: 75 },
  { day: 'Wed', value: 100 },
  { day: 'Thu', value: 75 },
  { day: 'Fri', value: 100 },
  { day: 'Sat', value: 50 },
  { day: 'Sun', value: 50 },
] as const;

type StatCardProps = {
  label: string;
  value: string;
  subtext: string;
  valueColor?: string;
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

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();

  // Empty state skipped for now — always show insights data.
  const showInsights = true;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Week of 12–18 May</Text>
        </View>

        {showInsights ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.cardLabel}>Weekly completion</Text>
              <Text style={styles.weeklyValue}>78%</Text>
              <Text style={styles.weeklySubtext}>22 of 28 scheduled habits completed this week</Text>

              <View style={styles.barChart}>
                {WEEKLY_BARS.map(({ day, value }) => (
                  <View key={day} style={styles.barColumn}>
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
                value="💧 Drink water"
                subtext="100% this week"
              />
              <StatCard label="Best day" value="Monday" subtext="94% avg on Mondays" />
            </View>

            <View style={styles.statRow}>
              <StatCard
                label="Momentum streak"
                value="9 ⚡"
                subtext="Best ever: 14 days"
              />
              <StatCard label="Tiny versions" value="4" subtext="Kept momentum going" />
            </View>

            <View style={styles.attentionCard}>
              <Text style={styles.cardLabel}>Needs attention</Text>
              <Text style={styles.attentionValue}>Read</Text>
              <Text style={styles.attentionSubtext}>
                Missed 3 times this month. Consider making it smaller.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Insights will appear after a few days of tracking
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
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
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
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
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
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
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
