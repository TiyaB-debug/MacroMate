import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/form';
import { colors, radius, spacing, type } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  step?: number; // 1-based, for the progress bar
  totalSteps?: number;
  children: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  showBack?: boolean;
};

/** Shared frame for every onboarding screen: back button, progress, heading, content, Continue. */
export function OnboardingLayout({
  title,
  subtitle,
  step,
  totalSteps = 5,
  children,
  continueLabel = 'Continue',
  onContinue,
  continueDisabled,
  showBack = true,
}: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          {showBack && router.canGoBack() ? (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
          {step ? (
            <View style={styles.progress} accessibilityLabel={`Step ${step} of ${totalSteps}`}>
              <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
            </View>
          ) : null}
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title={continueLabel} onPress={onContinue} disabled={continueDisabled} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    height: 44,
  },
  progress: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.5)' },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { ...type.display, color: colors.textOnBackground },
  subtitle: { ...type.body, color: colors.textOnBackground, marginTop: spacing.sm },
  body: { marginTop: spacing.xl, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, paddingTop: spacing.sm },
});
