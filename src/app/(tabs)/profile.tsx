import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/form';
import { Card, Screen, ScreenHeader } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useData } from '@/state/data';
import { useProfile } from '@/state/profile';
import { colors, spacing, type } from '@/theme';

const GOAL_LABELS: Record<string, string> = {
  track: 'Track my food', lose: 'Lose weight', maintain: 'Maintain weight', gain: 'Gain weight',
  muscle: 'Build muscle', nutrition: 'Improve nutrition', other: 'Something else', unsure: 'Not sure yet',
};

export default function AccountDetails() {
  const { profile, update, reset } = useProfile();
  const { resetAll } = useData();

  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase() || '?';
  const height = profile.metricHeight ? `${profile.heightCm} cm` : `${profile.heightFt}' ${profile.heightIn}"`;
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your Name';
  const t = profile.targets;

  const logOut = async () => {
    if (await confirm('Log out', 'Are you sure you want to log out?', 'Log Out')) router.replace('/sign-in');
  };

  // Apple requires in-app account deletion for any app with sign-up.
  const deleteAccount = async () => {
    const ok = await confirm(
      'Delete account',
      'This permanently deletes your account, recipes, pantry and food log. This cannot be undone.',
      'Delete',
      true,
    );
    if (!ok) return;
    reset();
    resetAll();
    router.replace('/sign-in');
  };

  return (
    <Screen tab>
      <ScreenHeader title="Account Details" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
        </View>

        <Card style={styles.list}>
          <EditableRow label="First Name" value={profile.firstName} onChange={(firstName) => update({ firstName })} />
          <EditableRow label="Last Name" value={profile.lastName} onChange={(lastName) => update({ lastName })} />
          <Row label="Sex" value={profile.sex === 'female' ? 'Female' : 'Male'} />
          <Row label="Height" value={height} />
          <Row label="Weight" value={`${profile.weight} ${profile.weightUnit}`} />
          <Row label="Age" value={String(profile.age)} />
          <Row label="Email" value={profile.email || '—'} last />
        </Card>

        <Card style={styles.list}>
          <Row label="Daily calories" value={`${t.calories.toLocaleString()} cal`} />
          <Row label="Protein / Carbs / Fat" value={`${t.protein}g / ${t.carbs}g / ${t.fat}g`} />
          <Row label="Goals" value={profile.goals.map((g) => GOAL_LABELS[g]).join(', ') || '—'} />
          <Row label="Diet" value={profile.diet.join(', ')} />
          <Row label="Allergies" value={profile.allergies.join(', ')} last />
        </Card>
        <Button title="Update my details & targets" variant="light" onPress={() => router.push('/onboarding/basic')} />

        <View style={styles.actions}>
          <Button title="Log Out" variant="light" onPress={logOut} />
          <Button title="Delete Account" variant="danger" onPress={deleteAccount} />
        </View>
        <Text style={styles.disclaimer}>MacroMate provides estimates for general guidance and is not medical advice.</Text>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function EditableRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={[styles.rowValue, styles.rowInput]}
        value={value}
        onChangeText={onChange}
        placeholder="Add"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  avatarWrap: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8DDF5',
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 30, fontWeight: '700', color: colors.text },
  name: { ...type.body, color: colors.text },
  list: { paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...type.label, color: colors.text, flexShrink: 0 },
  rowValue: { ...type.body, color: colors.textMuted, flex: 1, textAlign: 'right' },
  rowInput: { color: colors.text, padding: 0 },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  disclaimer: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
