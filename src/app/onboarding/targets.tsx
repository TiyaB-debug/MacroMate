import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { FieldLabel, RadioOption, TextField } from '@/components/form';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { suggestTargets, Targets, useProfile } from '@/state/profile';
import { colors, radius, spacing, type } from '@/theme';

const FIELDS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'cal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

// "How would you like to set your goals?" — last onboarding step.
export default function TargetsScreen() {
  const { profile, update } = useProfile();
  const suggested = useMemo(() => suggestTargets(profile), [profile]);
  const [mode, setMode] = useState(profile.targetMode);
  const [manual, setManual] = useState<Record<keyof Targets, string>>({
    calories: String(suggested.calories),
    protein: String(suggested.protein),
    carbs: String(suggested.carbs),
    fat: String(suggested.fat),
  });

  const manualTargets: Targets = {
    calories: parseInt(manual.calories, 10),
    protein: parseInt(manual.protein, 10),
    carbs: parseInt(manual.carbs, 10),
    fat: parseInt(manual.fat, 10),
  };
  const manualValid =
    manualTargets.calories >= 800 &&
    manualTargets.calories <= 6000 &&
    [manualTargets.protein, manualTargets.carbs, manualTargets.fat].every((n) => n >= 0 && n < 1000);

  const finish = () => {
    update({ targetMode: mode, targets: mode === 'suggest' ? suggested : manualTargets });
    router.dismissTo('/home');
  };

  return (
    <OnboardingLayout
      title="How would you like to set your goals?"
      subtitle="You can adjust these anytime in your profile."
      step={5}
      continueLabel="Finish"
      onContinue={finish}
      continueDisabled={mode === 'manual' && !manualValid}
    >
      <View>
        <RadioOption
          label="Let MacroMate suggest them"
          description="Based on your information and goals"
          selected={mode === 'suggest'}
          onPress={() => setMode('suggest')}
        />
        <RadioOption
          label="I know my targets"
          description="Enter calories, protein, carbs, and fat manually."
          selected={mode === 'manual'}
          onPress={() => setMode('manual')}
        />
      </View>

      {mode === 'suggest' ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your daily targets</Text>
          <Text style={styles.calories}>{suggested.calories.toLocaleString()} cal</Text>
          <View style={styles.macros}>
            <Macro label="Protein" grams={suggested.protein} color={colors.meals.breakfast} />
            <Macro label="Carbs" grams={suggested.carbs} color={colors.meals.lunch} />
            <Macro label="Fat" grams={suggested.fat} color={colors.meals.snacks} />
          </View>
          <Text style={styles.disclaimer}>An estimate for guidance only, not medical advice.</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {FIELDS.map((f) => (
            <View key={f.key}>
              <FieldLabel>{f.label}</FieldLabel>
              <TextField
                value={manual[f.key]}
                onChangeText={(v) => setManual((m) => ({ ...m, [f.key]: v.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
                suffix={f.unit}
                accessibilityLabel={`${f.label} target`}
              />
            </View>
          ))}
        </View>
      )}
    </OnboardingLayout>
  );
}

function Macro({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>{grams}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center' },
  cardLabel: { ...type.label, color: colors.textMuted },
  calories: { fontSize: 36, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  macros: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: spacing.lg },
  macro: { alignItems: 'center', gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: spacing.xs },
  macroValue: { ...type.heading, color: colors.text },
  macroLabel: { ...type.caption, color: colors.textMuted },
  disclaimer: { ...type.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
});
