import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useProfile } from '@/state/profile';
import { colors, spacing, type } from '@/theme';

/**
 * "Welcome [user name]" splash shown right after signing in.
 * Moves on automatically after a moment, or on tap.
 *
 * MASCOT: export the waving mate from Figma as assets/images/mascot.png, then
 * replace the placeholder <View> below with:
 *   <Image source={require('@/assets/images/mascot.png')} style={styles.mascot} />
 * (import Image from 'expo-image').
 */
export default function WelcomeScreen() {
  const { profile } = useProfile();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const goNext = () => router.replace(next === 'home' ? '/home' : '/onboarding');

  useEffect(() => {
    const t = setTimeout(goNext, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable style={styles.screen} onPress={goNext} accessibilityLabel="Continue">
      <Text style={styles.title}>Welcome</Text>
      <View style={styles.mascot}>
        <Text style={styles.mascotEmoji}>👋</Text>
      </View>
      <Text style={styles.name}>{profile.firstName}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  title: { ...type.display, fontSize: 40, color: colors.textOnBackground },
  mascot: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotEmoji: { fontSize: 72 },
  name: { fontSize: 24, color: colors.textOnBackground },
});
