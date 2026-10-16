import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CheckboxGroup, TextField } from '@/components/form';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { useProfile } from '@/state/profile';
import { colors, radius, spacing, type } from '@/theme';

const OPTIONS = ['None', 'Dairy', 'Eggs', 'Peanuts', 'Tree nuts', 'Gluten/wheat', 'Soy', 'Shellfish', 'Other'];

// "Any allergies?" plus "Additional preferences" (foods the user dislikes).
export default function Allergies() {
  const { profile, update } = useProfile();
  const [dislike, setDislike] = useState('');

  const addDislike = () => {
    const food = dislike.trim();
    if (food && !profile.dislikes.some((d) => d.toLowerCase() === food.toLowerCase())) {
      update({ dislikes: [...profile.dislikes, food] });
    }
    setDislike('');
  };

  return (
    <OnboardingLayout
      title="Any allergies?"
      subtitle="We'll keep these out of your recipe suggestions."
      step={4}
      onContinue={() => router.push('/onboarding/targets')}
    >
      <CheckboxGroup
        options={OPTIONS}
        selected={profile.allergies}
        onChange={(allergies) => update({ allergies })}
        exclusive="None"
      />

      <View>
        <Text style={styles.heading}>Additional preferences…</Text>
        <Text style={styles.sub}>Any food you just don't like?</Text>
        <TextField
          value={dislike}
          onChangeText={setDislike}
          placeholder="e.g. Broccoli"
          returnKeyType="done"
          onSubmitEditing={addDislike}
          accessibilityLabel="Add a food you don't like"
        />
        {profile.dislikes.length ? (
          <View style={styles.chips}>
            {profile.dislikes.map((d) => (
              <Pressable
                key={d}
                style={styles.chip}
                onPress={() => update({ dislikes: profile.dislikes.filter((x) => x !== d) })}
                accessibilityLabel={`Remove ${d}`}
              >
                <Text style={styles.chipText}>{d}</Text>
                <Ionicons name="close" size={14} color={colors.text} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  heading: { ...type.display, fontSize: 26, color: colors.textOnBackground },
  sub: { ...type.body, color: colors.textOnBackground, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipText: { ...type.label, color: colors.text },
});
