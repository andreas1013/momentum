import { Ionicons } from '@expo/vector-icons';
import { signInTestUser } from '@/lib/habits';
import { supabase } from '@/lib/supabase';
import type { ScheduleType } from '@/types/database';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const TEST_USER_ID = '3f550a2e-613e-4fa4-93ed-b0180ab5f7b2';

const QUICK_HABIT_NAMES = [
  'Walk',
  'Read',
  'Drink water',
  'Exercise',
  'Meditate',
  'Sleep early',
] as const;

const SCHEDULE_OPTIONS: { label: string; value: ScheduleType }[] = [
  { label: 'Every day', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Custom', value: 'custom' },
];

const CUSTOM_DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
] as const;

const TINY_SUGGESTIONS: Record<string, string> = {
  Walk: 'Walk for 3 minutes',
  Read: 'Read one page',
  Exercise: 'Do 5 push-ups',
  'Drink water': 'Drink one glass',
  Meditate: 'Breathe for 1 minute',
  'Sleep early': 'Be in bed by 10:30pm',
};

function getScheduleDays(scheduleType: ScheduleType, customDays: number[]): number[] {
  switch (scheduleType) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'weekdays':
      return [1, 2, 3, 4, 5];
    case 'weekends':
      return [0, 6];
    case 'custom':
      return [...customDays].sort((a, b) => a - b);
  }
}

async function saveHabit(params: {
  name: string;
  scheduleType: ScheduleType;
  customDays: number[];
  tinyVersion: string;
  reminderEnabled: boolean;
  reminderTime: string;
}): Promise<{ success: boolean }> {
  await signInTestUser();

  const scheduleDays = getScheduleDays(params.scheduleType, params.customDays);

  const { error } = await supabase.from('habits').insert({
    user_id: TEST_USER_ID,
    name: params.name.trim(),
    schedule_type: params.scheduleType,
    schedule_days: scheduleDays,
    tiny_version: params.tinyVersion.trim(),
    reminder_enabled: params.reminderEnabled,
    reminder_time: params.reminderEnabled ? params.reminderTime : null,
    status: 'active',
    category: null,
  });

  if (error) {
    console.error('saveHabit:', error);
    return { success: false };
  }

  return { success: true };
}

export default function CreateHabitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [tinyVersion, setTinyVersion] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tinySuggestion = useMemo(() => {
    const trimmed = name.trim();
    return TINY_SUGGESTIONS[trimmed] ?? null;
  }, [name]);

  const canSave = useMemo(() => {
    if (!name.trim() || !tinyVersion.trim()) return false;
    if (scheduleType === 'custom' && customDays.length === 0) return false;
    return true;
  }, [name, tinyVersion, scheduleType, customDays]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleToggleCustomDay = useCallback((dayValue: number) => {
    setCustomDays((current) =>
      current.includes(dayValue)
        ? current.filter((day) => day !== dayValue)
        : [...current, dayValue],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;

    setSaving(true);
    setErrorMessage(null);

    const result = await saveHabit({
      name,
      scheduleType,
      customDays,
      tinyVersion,
      reminderEnabled,
      reminderTime,
    });

    setSaving(false);

    if (result.success) {
      router.back();
      return;
    }

    setErrorMessage('Could not save habit. Try again.');
  }, [
    canSave,
    saving,
    name,
    scheduleType,
    customDays,
    tinyVersion,
    reminderEnabled,
    reminderTime,
    router,
  ]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          hitSlop={Spacing.sm}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Habit</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What habit do you want to build?</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Walk, Read, Meditate"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.chipRow}>
            {QUICK_HABIT_NAMES.map((habitName) => (
              <Pressable
                key={habitName}
                onPress={() => setName(habitName)}
                style={({ pressed }) => [
                  styles.chip,
                  name === habitName && styles.chipSelected,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[styles.chipText, name === habitName && styles.chipTextSelected]}>
                  {habitName}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>How often?</Text>
          <View style={styles.chipRow}>
            {SCHEDULE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setScheduleType(option.value)}
                style={({ pressed }) => [
                  styles.chip,
                  scheduleType === option.value && styles.chipSelected,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    scheduleType === option.value && styles.chipTextSelected,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {scheduleType === 'custom' && (
            <View style={styles.customDaysRow}>
              {CUSTOM_DAYS.map((day) => {
                const selected = customDays.includes(day.value);
                return (
                  <Pressable
                    key={day.label}
                    onPress={() => handleToggleCustomDay(day.value)}
                    style={({ pressed }) => [
                      styles.dayToggle,
                      selected && styles.dayToggleSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={[styles.dayToggleText, selected && styles.dayToggleTextSelected]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>What&apos;s the smallest version on a busy day?</Text>
          <TextInput
            style={styles.textInput}
            value={tinyVersion}
            onChangeText={setTinyVersion}
            placeholder="e.g. Walk for 3 minutes"
            placeholderTextColor={Colors.textMuted}
          />
          {tinySuggestion ? (
            <Pressable
              onPress={() => setTinyVersion(tinySuggestion)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
              <Text style={styles.suggestionText}>{tinySuggestion}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Daily reminder</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: Colors.border, true: Colors.doneLight }}
              thumbColor={reminderEnabled ? Colors.done : Colors.white}
            />
          </View>
          {reminderEnabled && (
            <TextInput
              style={styles.textInput}
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="08:00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          )}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
            pressed && canSave && styles.pressed,
          ]}>
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
            Save habit
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    backgroundColor: Colors.doneLight,
    borderColor: Colors.done,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.done,
    fontWeight: '600',
  },
  customDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  dayToggle: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  dayToggleSelected: {
    backgroundColor: Colors.done,
    borderColor: Colors.done,
  },
  dayToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dayToggleTextSelected: {
    color: Colors.white,
  },
  suggestion: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.tiny,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    color: Colors.missed,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cream,
  },
  saveButton: {
    backgroundColor: Colors.done,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.border,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  saveButtonTextDisabled: {
    color: Colors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
