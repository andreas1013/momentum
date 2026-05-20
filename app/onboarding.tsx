import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>(1);

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

  return <View style={[styles.screen, { paddingTop: insets.top }]} />;
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
});
