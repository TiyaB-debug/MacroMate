import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { OnboardingLayout } from '@/components/OnboardingLayout';
import { colors, spacing, type } from '@/theme';

// "Let's personalize your experience." intro screen.
export default function OnboardingIntro() {
  return (
    <OnboardingLayout
      title="Let's personalize your experience."
      continueLabel="Get Started"
      onContinue={() => router.push('/onboarding/basic')}
      showBack={false}
    >
      {/* Replace with the mascot image (see welcome.tsx) */}
      <View style={styles.mascot}>
        <Text style={{ fontSize: 64 }}>👋</Text>
      </View>
      <Text style={styles.body}>We'll use a few details about you to create a tailored experience.</Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  mascot: {
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  body: { ...type.display, fontSize: 26, lineHeight: 34, color: colors.textOnBackground },
});
