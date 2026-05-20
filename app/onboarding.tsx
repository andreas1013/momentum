import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

type OnboardingHabit = {
  id: string;
  name: string;
  goal: string;
  tinyVersion: string;
  scheduleType: 'daily' | 'weekdays';
  scheduleDays: number[];
  circleColor: string;
  letter: string;
  popular?: boolean;
};

const ONBOARDING_HABITS: OnboardingHabit[] = [
  {
    id: 'walk',
    name: 'Walk',
    goal: '30 min · Weekdays',
    tinyVersion: 'Walk for 5 minutes',
    scheduleType: 'weekdays',
    scheduleDays: [1, 2, 3, 4, 5],
    circleColor: '#4A9B8E',
    letter: 'W',
    popular: true,
  },
  {
    id: 'read',
    name: 'Read',
    goal: '20 min · Daily',
    tinyVersion: 'Read one page',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    circleColor: '#C4872A',
    letter: 'R',
    popular: true,
  },
  {
    id: 'water',
    name: 'Drink water',
    goal: '8 glasses · Daily',
    tinyVersion: 'Drink 3 glasses',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    circleColor: '#3E6FA3',
    letter: 'D',
    popular: true,
  },
  {
    id: 'meditate',
    name: 'Meditate',
    goal: '10 min · Daily',
    tinyVersion: 'Breathe for 2 minutes',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    circleColor: '#7B6FA0',
    letter: 'M',
  },
  {
    id: 'exercise',
    name: 'Exercise',
    goal: '30 min · Weekdays',
    tinyVersion: 'Do 10 push-ups',
    scheduleType: 'weekdays',
    scheduleDays: [1, 2, 3, 4, 5],
    circleColor: '#C05B3A',
    letter: 'E',
  },
  {
    id: 'sleep',
    name: 'Sleep early',
    goal: 'By 10pm · Daily',
    tinyVersion: 'In bed by 11pm',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    circleColor: '#3D5A8A',
    letter: 'S',
  },
  {
    id: 'journal',
    name: 'Journal',
    goal: '10 min · Daily',
    tinyVersion: 'Write one sentence',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    circleColor: '#4A8A6A',
    letter: 'J',
  },
  {
    id: 'custom',
    name: 'Something else',
    goal: 'Your habit',
    tinyVersion: '',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    circleColor: '#A09A94',
    letter: '+',
  },
];

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i < current ? styles.stepDotActive : styles.stepDotInactive]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [selectedHabits, setSelectedHabits] = useState<OnboardingHabit[]>([]);

  if (step === 1) {
    return (
      <EmotionalHookScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        onContinue={() => setStep(2)}
        onSkip={() => router.replace('/(tabs)/today')}
      />
    );
  }

  if (step === 2) {
    return (
      <PromiseScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        onBack={() => setStep(1)}
        onContinue={() => setStep(3)}
      />
    );
  }

  if (step === 3) {
    return (
      <HabitPickerScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        onBack={() => setStep(2)}
        onContinue={(habits) => {
          setSelectedHabits(habits);
          setStep(4);
        }}
      />
    );
  }

  if (step === 4) {
    return (
      <FirstWinScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        habits={selectedHabits}
        onContinue={() => setStep(5)}
      />
    );
  }

  if (step === 5) {
    return (
      <AuthScreen
        bottomInset={insets.bottom}
        topInset={insets.top}
        selectedHabits={selectedHabits}
        onBack={() => setStep(4)}
      />
    );
  }

  return null;
}

type ScreenLayoutProps = {
  topInset: number;
  bottomInset: number;
  children: ReactNode;
  footer: ReactNode;
  header?: ReactNode;
};

function ScreenLayout({ topInset, bottomInset, children, footer, header }: ScreenLayoutProps) {
  return (
    <View style={[styles.screen, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      {header}
      <View style={styles.content}>{children}</View>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

type EmotionalHookScreenProps = {
  topInset: number;
  bottomInset: number;
  onContinue: () => void;
  onSkip: () => void;
};

function EmotionalHookScreen({
  topInset,
  bottomInset,
  onContinue,
  onSkip,
}: EmotionalHookScreenProps) {
  return (
    <ScreenLayout
      topInset={topInset}
      bottomInset={bottomInset}
      footer={
        <>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={onContinue}>
            <Text style={styles.primaryButtonText}>That&apos;s me →</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ghostLink, pressed && styles.buttonPressed]}
            onPress={onSkip}>
            <Text style={styles.ghostLinkText}>I just want to look around</Text>
          </Pressable>
        </>
      }>
      <View style={styles.logoWrap}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>↑</Text>
        </View>
      </View>

      <View style={styles.headlineBlock}>
        <Text style={styles.headline}>Some days</Text>
        <Text style={styles.headline}>are hard.</Text>
        <View style={styles.headlinePause} />
        <Text style={styles.headline}>That&apos;s not failure.</Text>
        <Text style={styles.headline}>That&apos;s just life.</Text>
      </View>

      <Text style={styles.subtext}>
        Missing a habit doesn&apos;t make you a failure.{'\n'}It makes you human.
      </Text>
    </ScreenLayout>
  );
}

type PromiseScreenProps = {
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onContinue: () => void;
};

const FEATURE_ROWS = [
  'Track habits and build streaks',
  'Use your backup plan on busy days',
  'Keep going — even after a miss',
] as const;

function PromiseScreen({ topInset, bottomInset, onBack, onContinue }: PromiseScreenProps) {
  return (
    <ScreenLayout
      topInset={topInset}
      bottomInset={bottomInset}
      header={
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={onBack}
          hitSlop={Spacing.sm}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back' }}
            size={24}
            tintColor={Colors.textPrimary}
          />
        </Pressable>
      }
      footer={
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={onContinue}>
          <Text style={styles.primaryButtonText}>Let&apos;s start →</Text>
        </Pressable>
      }>
      <View style={{ height: '12%' }} />
      <Text style={styles.brandLabel}>MOMENTUM</Text>

      <View style={styles.headlineBlock}>
        <Text style={styles.headline}>Build habits that</Text>
        <Text style={styles.headline}>survive real life.</Text>
      </View>

      <Text style={styles.subtext}>
        Most habit apps make you feel like a failure{'\n'}when you miss a day.{'\n\n'}Momentum helps
        you keep going.
      </Text>

      <View style={styles.featureList}>
        {FEATURE_ROWS.map((label) => (
          <View key={label} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{label}</Text>
          </View>
        ))}
      </View>
    </ScreenLayout>
  );
}

type HabitPickerScreenProps = {
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onContinue: (habits: OnboardingHabit[]) => void;
};

function HabitPickerScreen({ topInset, bottomInset, onBack, onContinue }: HabitPickerScreenProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleHabit = (id: string) => {
    if (id === 'custom') return;
    setSelected((current) =>
      current.includes(id) ? current.filter((h) => h !== id) : [...current, id],
    );
  };

  const canContinue = selected.length > 0;

  const handleContinue = () => {
    const habits = ONBOARDING_HABITS.filter((h) => selected.includes(h.id));
    onContinue(habits);
  };

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <StepDots current={3} total={5} />

      <View style={styles.pickerHeader}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          hitSlop={Spacing.sm}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.pickerTitleBlock}>
        <Text style={styles.pickerHeadline}>What will you build?</Text>
        <Text style={styles.pickerSubtext}>
          Pick the habits that matter to you.{'\n'}
          Everything is pre-configured — customise later.
        </Text>
      </View>

      <View style={styles.habitGrid}>
        {ONBOARDING_HABITS.map((habit) => {
          const isSelected = selected.includes(habit.id);
          return (
            <Pressable
              key={habit.id}
              onPress={() => toggleHabit(habit.id)}
              style={({ pressed }) => [
                styles.habitTile,
                isSelected && styles.habitTileSelected,
                pressed && styles.buttonPressed,
              ]}>
              {habit.popular ? (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Popular</Text>
                </View>
              ) : null}
              <View style={[styles.habitCircle, { backgroundColor: habit.circleColor }]}>
                <Text style={styles.habitCircleLetter}>{habit.letter}</Text>
              </View>
              <Text style={[styles.habitTileName, isSelected && styles.habitTileNameSelected]}>
                {habit.name}
              </Text>
              <Text style={styles.habitTileGoal}>
                {habit.id === 'custom' ? 'Add your own' : habit.goal}
              </Text>
              {isSelected ? (
                <View style={styles.habitCheckmark}>
                  <Text style={styles.habitCheckmarkText}>✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.selectionCount}>
        {selected.length === 0
          ? 'Tap a habit to select it'
          : `${selected.length} habit${selected.length > 1 ? 's' : ''} selected`}
      </Text>

      <View style={[styles.pickerFooter, { paddingBottom: bottomInset + Spacing.lg }]}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.primaryButton,
            !canContinue && styles.primaryButtonDisabled,
            pressed && canContinue && styles.buttonPressed,
          ]}>
          <Text
            style={[
              styles.primaryButtonText,
              !canContinue && styles.primaryButtonTextDisabled,
            ]}>
            Build these habits →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type FirstWinScreenProps = {
  topInset: number;
  bottomInset: number;
  habits: OnboardingHabit[];
  onContinue: () => void;
};

function FirstWinScreen({ topInset, bottomInset, habits, onContinue }: FirstWinScreenProps) {
  const [markedDone, setMarkedDone] = useState<string[]>([]);
  const anyDone = markedDone.length > 0;

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <StepDots current={4} total={5} />

      <ScrollView
        contentContainerStyle={styles.firstWinScroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.firstWinHeader}>
          <Text style={styles.firstWinHeadline}>
            {anyDone ? "You're already building momentum." : 'Start today.'}
          </Text>
          <Text style={styles.firstWinSubtext}>
            {anyDone
              ? 'Day 1 is done. Keep going — every small step counts.'
              : 'Mark your first habit as done to start your streak.'}
          </Text>
        </View>

        <View style={styles.firstWinCards}>
          {habits.map((habit) => {
            const isDone = markedDone.includes(habit.id);
            return (
              <View
                key={habit.id}
                style={[styles.firstWinCard, isDone && styles.firstWinCardDone]}>
                <View style={styles.firstWinCardLeft}>
                  <View
                    style={[
                      styles.firstWinCircle,
                      { backgroundColor: isDone ? Colors.done : habit.circleColor },
                    ]}>
                    <Text style={styles.firstWinCircleLetter}>{isDone ? '✓' : habit.letter}</Text>
                  </View>
                  <View style={styles.firstWinCardInfo}>
                    <Text
                      style={[styles.firstWinCardName, isDone && styles.firstWinCardNameDone]}>
                      {habit.name}
                    </Text>
                    <Text style={styles.firstWinCardGoal}>{habit.goal}</Text>
                  </View>
                </View>
                {!isDone ? (
                  <Pressable
                    onPress={() => setMarkedDone((current) => [...current, habit.id])}
                    style={({ pressed }) => [
                      styles.firstWinDoneButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.firstWinDoneButtonText}>Done</Text>
                  </Pressable>
                ) : (
                  <View style={styles.firstWinDoneTag}>
                    <Text style={styles.firstWinDoneTagText}>Day 1 ⚡</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {anyDone ? (
          <View style={styles.recoveryPromise}>
            <Text style={styles.recoveryPromiseTitle}>Your backup plan is ready.</Text>
            <Text style={styles.recoveryPromiseText}>
              If life gets in the way, a smaller version of each habit still keeps your momentum
              going.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.pickerFooter, { paddingBottom: bottomInset + Spacing.lg }]}>
        {anyDone ? (
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.primaryButtonText}>Save my progress →</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.skipHint}>
              Mark at least one habit done to save your progress.
            </Text>
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.ghostLink, pressed && styles.buttonPressed]}>
              <Text style={styles.ghostLinkText}>I&apos;ll do it later →</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

type AuthScreenProps = {
  topInset: number;
  bottomInset: number;
  selectedHabits: OnboardingHabit[];
  onBack: () => void;
};

function AuthScreen({ topInset, bottomInset, selectedHabits, onBack }: AuthScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'options' | 'email-signup' | 'email-login'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveHabitsForUser(userId: string) {
    const TEST_USER_ID = userId;

    await supabase.from('users').upsert({
      user_id: userId,
      timezone: 'UTC',
    });

    const habitsToInsert = selectedHabits
      .filter((h) => h.id !== 'custom')
      .map((h) => ({
        user_id: TEST_USER_ID,
        name: h.name,
        schedule_type: h.scheduleType,
        schedule_days: h.scheduleDays,
        tiny_version: h.tinyVersion,
        reminder_enabled: false,
        status: 'active',
        category: null,
      }));

    if (habitsToInsert.length > 0) {
      await supabase.from('habits').insert(habitsToInsert);
    }
  }

  async function handleEmailSignUp() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and a password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await saveHabitsForUser(data.user.id);
    }

    setLoading(false);
    router.replace('/(tabs)/today');
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace('/(tabs)/today');
  }

  if (mode === 'options') {
    return (
      <View style={[styles.screen, { paddingTop: topInset }]}>
        <StepDots current={5} total={5} />

        <View style={styles.pickerHeader}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            hitSlop={Spacing.sm}>
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        </View>

        <View style={styles.authContent}>
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>↑</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headline}>Save your{'\n'}progress.</Text>
            <Text style={styles.subtext}>
              Create a free account to keep your habits{'\n'}
              safe and sync across your devices.
            </Text>
          </View>
        </View>

        <View style={[styles.authFooter, { paddingBottom: bottomInset + Spacing.lg }]}>
          <Pressable
            style={({ pressed }) => [styles.appleButton, pressed && styles.buttonPressed]}
            onPress={() => setMode('email-signup')}>
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
            onPress={() => setMode('email-signup')}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          <Text style={styles.comingSoonNote}>Apple and Google sign-in coming soon</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={() => setMode('email-signup')}
            style={({ pressed }) => [styles.emailLink, pressed && styles.buttonPressed]}>
            <Text style={styles.emailLinkText}>Continue with Email</Text>
          </Pressable>

          <Text style={styles.authFooterNote}>
            Already have an account?{' '}
            <Text style={styles.authFooterLink} onPress={() => setMode('email-login')}>
              Log in
            </Text>
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: topInset }]}>
      <StepDots current={5} total={5} />

      <View style={styles.pickerHeader}>
        <Pressable
          onPress={() => {
            setMode('options');
            setError(null);
          }}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          hitSlop={Spacing.sm}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.authFormBlock}>
        <Text style={styles.pickerHeadline}>
          {mode === 'email-signup' ? 'Create your account.' : 'Welcome back.'}
        </Text>
        <Text style={styles.pickerSubtext}>
          {mode === 'email-signup'
            ? 'Your habits and progress will be saved securely.'
            : 'Log in to access your habits and progress.'}
        </Text>
      </View>

      <View style={styles.authForm}>
        <TextInput
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.textInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
        />
        {error ? <Text style={styles.authError}>{error}</Text> : null}
      </View>

      <View style={[styles.pickerFooter, { paddingBottom: bottomInset + Spacing.lg }]}>
        <Pressable
          onPress={mode === 'email-signup' ? handleEmailSignUp : handleEmailLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            loading && styles.primaryButtonDisabled,
            pressed && !loading && styles.buttonPressed,
          ]}>
          <Text style={[styles.primaryButtonText, loading && styles.primaryButtonTextDisabled]}>
            {loading
              ? 'Saving...'
              : mode === 'email-signup'
                ? 'Create account →'
                : 'Log in →'}
          </Text>
        </Pressable>

        {mode === 'email-signup' ? (
          <Pressable
            onPress={() => setMode('email-login')}
            style={({ pressed }) => [styles.ghostLink, pressed && styles.buttonPressed]}>
            <Text style={styles.ghostLinkText}>Already have an account? Log in</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '18%',
    width: '100%',
  },
  footer: {
    width: '100%',
    paddingBottom: Spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 26,
    color: Colors.white,
    fontWeight: '700',
    lineHeight: 30,
  },
  headlineBlock: {
    alignItems: 'center',
    width: '100%',
  },
  headline: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 34 * 1.2,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headlinePause: {
    height: Spacing.lg,
  },
  subtext: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 17 * 1.55,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    color: Colors.done,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  featureList: {
    marginTop: Spacing.xl,
    width: '100%',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureCheck: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.done,
    width: 20,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: Colors.done,
    borderRadius: Radius.pill,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  ghostLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  ghostLinkText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    backgroundColor: Colors.done,
    width: 18,
  },
  stepDotInactive: {
    backgroundColor: Colors.border,
  },
  pickerHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backChevron: {
    fontSize: 28,
    color: Colors.textPrimary,
    fontWeight: '300',
    lineHeight: 32,
  },
  pickerTitleBlock: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  pickerHeadline: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  pickerSubtext: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  habitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flex: 1,
  },
  habitTile: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    position: 'relative',
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  habitTileSelected: {
    borderColor: Colors.done,
    backgroundColor: Colors.doneLight,
  },
  habitTileDisabled: {
    opacity: 0.4,
  },
  popularBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.done,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  habitCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  habitCircleLetter: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
  habitTileName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  habitTileNameSelected: {
    color: Colors.done,
  },
  habitTileGoal: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  habitCheckmark: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCheckmarkText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '700',
  },
  selectionCount: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  pickerFooter: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.border,
  },
  primaryButtonTextDisabled: {
    color: Colors.textMuted,
  },
  firstWinScroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  firstWinHeader: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  firstWinHeadline: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  firstWinSubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  firstWinCards: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  firstWinCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  firstWinCardDone: {
    backgroundColor: Colors.doneLight,
    borderColor: Colors.done,
  },
  firstWinCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  firstWinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  firstWinCircleLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  firstWinCardInfo: {
    flex: 1,
  },
  firstWinCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  firstWinCardNameDone: {
    color: Colors.done,
  },
  firstWinCardGoal: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  firstWinDoneButton: {
    backgroundColor: Colors.done,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexShrink: 0,
  },
  firstWinDoneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  firstWinDoneTag: {
    backgroundColor: Colors.doneLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexShrink: 0,
  },
  firstWinDoneTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.done,
  },
  recoveryPromise: {
    backgroundColor: Colors.momentumLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.momentum,
  },
  recoveryPromiseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  recoveryPromiseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  skipHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  authContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: '22%',
    paddingBottom: Spacing.xxl,
  },
  authFooter: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  comingSoonNote: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -Spacing.xs,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: Radius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  appleButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  appleIcon: {
    fontSize: 18,
    color: Colors.white,
    lineHeight: 22,
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  authButtonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    backgroundColor: '#4285F4',
  },
  googleIconText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  emailLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emailLinkText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  authFooterNote: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    paddingBottom: Spacing.sm,
  },
  authFooterLink: {
    color: Colors.done,
    fontWeight: '600',
  },
  authFormBlock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  authForm: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    flex: 1,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  authError: {
    fontSize: 14,
    color: Colors.missed,
    marginTop: Spacing.xs,
  },
});
