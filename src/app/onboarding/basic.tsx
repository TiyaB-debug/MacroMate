import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { FieldLabel, Select, TextField, ToggleRow } from '@/components/form';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { Sex, useProfile } from '@/state/profile';
import { spacing } from '@/theme';

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const AGE_OPTIONS = range(13, 100).map((n) => ({ label: String(n), value: n }));
const FT_OPTIONS = range(3, 7).map((n) => ({ label: `${n} ft`, value: n }));
const IN_OPTIONS = range(0, 11).map((n) => ({ label: `${n} in`, value: n }));
const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
];
const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'].map((g) => ({ label: g, value: g }));

// "First, let's get to know you." Sex is used for the calorie formula;
// gender is optional and only used for personalization.
export default function BasicInfo() {
  const { profile, update } = useProfile();
  const [weightText, setWeightText] = useState(String(profile.weight));
  const [cmText, setCmText] = useState(String(profile.heightCm));

  const weight = parseFloat(weightText);
  const cm = parseFloat(cmText);
  const valid = weight > 20 && weight < 1000 && (!profile.metricHeight || (cm > 90 && cm < 250));

  const toggleWeightUnit = (useKg: boolean) => {
    const unit = useKg ? 'kg' : 'lbs';
    if (unit === profile.weightUnit) return;
    if (weight) {
      const converted = useKg ? weight * 0.453592 : weight / 0.453592;
      setWeightText(String(Math.round(converted)));
    }
    update({ weightUnit: unit });
  };

  const toggleMetricHeight = (metric: boolean) => {
    if (metric) setCmText(String(Math.round((profile.heightFt * 12 + profile.heightIn) * 2.54)));
    else if (cm) {
      const totalIn = Math.round(cm / 2.54);
      update({ heightFt: Math.floor(totalIn / 12), heightIn: totalIn % 12 });
    }
    update({ metricHeight: metric });
  };

  const next = () => {
    update({ weight, heightCm: cm || profile.heightCm });
    router.push('/onboarding/goals');
  };

  return (
    <OnboardingLayout title="First, let's get to know you." step={1} onContinue={next} continueDisabled={!valid}>
      <View>
        <FieldLabel>Age</FieldLabel>
        <Select value={profile.age} options={AGE_OPTIONS} onChange={(age) => update({ age })} accessibilityLabel="Age" />
      </View>

      <View>
        <FieldLabel>Sex</FieldLabel>
        <Select value={profile.sex} options={SEX_OPTIONS} onChange={(sex) => update({ sex })} accessibilityLabel="Sex" />
      </View>

      <View>
        <FieldLabel>Gender (optional)</FieldLabel>
        <Select
          value={profile.gender}
          options={GENDER_OPTIONS}
          onChange={(gender) => update({ gender })}
          placeholder="Select"
          accessibilityLabel="Gender"
        />
      </View>

      <View style={styles.group}>
        <FieldLabel>Weight</FieldLabel>
        <TextField
          value={weightText}
          onChangeText={setWeightText}
          keyboardType="decimal-pad"
          suffix={profile.weightUnit}
          accessibilityLabel="Weight"
        />
        <ToggleRow label="Use kg" value={profile.weightUnit === 'kg'} onChange={toggleWeightUnit} />
      </View>

      <View style={styles.group}>
        <FieldLabel>Height</FieldLabel>
        {profile.metricHeight ? (
          <TextField value={cmText} onChangeText={setCmText} keyboardType="number-pad" suffix="cm" accessibilityLabel="Height in centimeters" />
        ) : (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Select value={profile.heightFt} options={FT_OPTIONS} onChange={(heightFt) => update({ heightFt })} accessibilityLabel="Height feet" />
            </View>
            <View style={{ flex: 1 }}>
              <Select value={profile.heightIn} options={IN_OPTIONS} onChange={(heightIn) => update({ heightIn })} accessibilityLabel="Height inches" />
            </View>
          </View>
        )}
        <ToggleRow label="Metric" value={profile.metricHeight} onChange={toggleMetricHeight} />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
});
