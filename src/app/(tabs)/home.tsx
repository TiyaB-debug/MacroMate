import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { MacroRing } from '@/components/MacroRing';
import { MACRO_COLORS } from '@/components/MacroSummary';
import { MealRow } from '@/components/MealRow';
import { useData } from '@/state/data';
import { useProfile } from '@/state/profile';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, radius, spacing, type } from '@/theme';

export default function HomeScreen() {
  const { profile } = useProfile();
  const { log } = useData();
  const goal = profile.targets.calories;

  const byMeal = Object.fromEntries(
    MEAL_ORDER.map((m) => [m, log.filter((e) => e.meal === m).reduce((s, e) => s + e.calories, 0)]),
  ) as Record<MealType, number>;
  const eaten = MEAL_ORDER.reduce((sum, m) => sum + byMeal[m], 0);
  const sum = (k: 'protein' | 'carbs' | 'fat') => log.reduce((s, e) => s + e[k], 0);
  const remaining = goal - eaten;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const openMeal = (meal: MealType) => router.push({ pathname: '/add-meal', params: { meal } });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.greeting}>Hey {profile.firstName || 'there'}</Text>

        <View style={styles.ringWrap}>
          <MacroRing total={goal} segments={MEAL_ORDER.map((m) => ({ value: byMeal[m], color: colors.meals[m] }))}>
            <Text style={styles.ringValue}>{eaten.toLocaleString()}</Text>
            <Text style={styles.ringLabel}>of {goal.toLocaleString()} cal</Text>
          </MacroRing>
          <Text style={styles.remaining}>
            {eaten === 0
              ? 'Tap + to log your first meal'
              : remaining >= 0
                ? `${remaining.toLocaleString()} cal left today`
                : `${Math.abs(remaining).toLocaleString()} cal over your goal`}
          </Text>
        </View>

        <View style={styles.macros}>
          <MacroBar label="Protein" eaten={sum('protein')} target={profile.targets.protein} color={MACRO_COLORS.protein} />
          <MacroBar label="Carbs" eaten={sum('carbs')} target={profile.targets.carbs} color={MACRO_COLORS.carbs} />
          <MacroBar label="Fat" eaten={sum('fat')} target={profile.targets.fat} color={MACRO_COLORS.fat} />
        </View>

        <View style={styles.meals}>
          {MEAL_ORDER.map((m) => (
            <MealRow
              key={m}
              label={MEAL_LABELS[m]}
              color={colors.meals[m]}
              calories={byMeal[m] || undefined}
              onPress={() => openMeal(m)}
              onAdd={() => openMeal(m)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroBar({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  const pct = Math.min(eaten / Math.max(target, 1), 1);
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>
        {eaten}/{target}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  date: { ...type.caption, color: colors.textOnBackground },
  greeting: { ...type.heading, fontSize: 20, color: colors.text, marginTop: spacing.sm },
  ringWrap: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.md },
  ringValue: { fontSize: 34, fontWeight: '700', color: colors.text },
  ringLabel: { ...type.label, color: colors.text },
  remaining: { ...type.label, color: colors.text },
  macros: {
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  macroLabel: { ...type.caption, fontWeight: '600', color: colors.text },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  macroValue: { ...type.caption, color: colors.textMuted },
  meals: { gap: spacing.md },
});
