import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { OnboardingLayout } from '@/components/OnboardingLayout';
import { Goal, useProfile } from '@/state/profile';
import { colors, radius, spacing, type } from '@/theme';

// Descriptions replace the "blah blah" placeholder copy from the Figma — edit freely.
const GOALS: { value: Goal; title: string; description: string }[] = [
  { value: 'track', title: 'Track my food', description: 'Log what you eat and see where your calories and macros come from.' },
  { value: 'lose', title: 'Lose weight', description: "We'll set a moderate calorie deficit so progress is steady and sustainable." },
  { value: 'maintain', title: 'Maintain weight', description: 'Keep your intake balanced around what your body uses each day.' },
  { value: 'gain', title: 'Gain weight', description: "We'll add a small calorie surplus to help you gain gradually." },
  { value: 'muscle', title: 'Build muscle', description: 'Higher protein targets and a slight surplus to support training.' },
  { value: 'nutrition', title: 'Improve nutrition', description: 'Focus on balanced meals and recipes that fit your preferences.' },
  { value: 'other', title: 'Something else', description: "No problem — you can still use every feature and adjust targets anytime." },
  { value: 'unsure', title: "I'm not sure yet", description: "Start by tracking for a few days. We'll keep things simple." },
];

// "Any goals in mind?" Multi-select; a selected card expands to show its description.
export default function Goals() {
  const { profile, update } = useProfile();

  const toggle = (g: Goal) => {
    const has = profile.goals.includes(g);
    let next = has ? profile.goals.filter((x) => x !== g) : [...profile.goals, g];
    // Lose / maintain / gain contradict each other, so keep only the latest one
    const weightGoals: Goal[] = ['lose', 'maintain', 'gain'];
    if (!has && weightGoals.includes(g)) next = next.filter((x) => x === g || !weightGoals.includes(x));
    update({ goals: next });
  };

  return (
    <OnboardingLayout
      title="Any goals in mind?"
      subtitle="How would you like to use this app? Pick as many as you like."
      step={2}
      onContinue={() => router.push('/onboarding/diet')}
      continueDisabled={profile.goals.length === 0}
    >
      <View style={{ gap: spacing.md }}>
        {GOALS.map((g) => {
          const selected = profile.goals.includes(g.value);
          return (
            <Pressable
              key={g.value}
              onPress={() => toggle(g.value)}
              style={[styles.card, selected && styles.cardSelected]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'chevron-down'}
                  size={selected ? 22 : 18}
                  color={colors.text}
                />
              </View>
              {selected ? <Text style={styles.cardDesc}>{g.description}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>You can change this anytime.</Text>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...type.body, fontWeight: '600', color: colors.text },
  cardDesc: { ...type.body, color: colors.text, marginTop: spacing.sm },
  note: { ...type.body, color: colors.text, textAlign: 'center' },
});
