import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { MacroRing } from '../../components/MacroRing';
import { MACRO_COLORS } from '../../components/MacroSummary';
import { MealRow } from '../../components/MealRow';
import { useData } from '../../state/data';
import { useProfile } from '../../state/profile';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, radius, spacing, type } from '../../theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { profile } = useProfile();
  const { log } = useData();
  const goal = profile.targets.calories;

  const entriesFor = (m: MealType) => log.filter((e) => e.meal === m);
  const byMeal = Object.fromEntries(
    MEAL_ORDER.map((m) => [m, entriesFor(m).reduce((s, e) => s + e.calories, 0)]),
  ) as Record<MealType, number>;
  const eaten = MEAL_ORDER.reduce((sum, m) => sum + byMeal[m], 0);
  const sum = (k: 'protein' | 'carbs' | 'fat') => log.reduce((s, e) => s + e[k], 0);
  const remaining = goal - eaten;
  const over = remaining < 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const openMeal = (meal: MealType) => router.push({ pathname: '/add-meal', params: { meal } });
  const name = profile.firstName || 'there';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.greeting}>
              {greeting()}, {name}
            </Text>
          </View>
          <Pressable
            onPress={() => router.navigate('/profile')}
            style={styles.avatar}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
          >
            <Text style={styles.avatarText}>{name[0]?.toUpperCase()}</Text>
          </Pressable>
        </View>

        {/* The plate: today's calories by meal */}
        <View style={styles.plate}>
          <MacroRing
            size={236}
            strokeWidth={20}
            gap={eaten > 0 ? 4 : 0}
            trackColor={colors.surfaceMuted}
            total={goal}
            segments={MEAL_ORDER.map((m) => ({ value: byMeal[m], color: colors.meals[m] }))}
          >
            <Text style={styles.eaten}>{eaten.toLocaleString()}</Text>
            <Text style={styles.ofGoal}>of {goal.toLocaleString()} cal</Text>
          </MacroRing>

          <View style={[styles.status, over && styles.statusOver]}>
            <Text style={[styles.statusText, over && styles.statusTextOver]}>
              {eaten === 0
                ? 'Log a meal to fill your plate'
                : over
                  ? `${Math.abs(remaining).toLocaleString()} cal over your goal`
                  : `${remaining.toLocaleString()} cal left today`}
            </Text>
          </View>

          <View style={styles.macros}>
            <Macro label="Protein" eaten={sum('protein')} target={profile.targets.protein} color={MACRO_COLORS.protein} />
            <Macro label="Carbs" eaten={sum('carbs')} target={profile.targets.carbs} color={MACRO_COLORS.carbs} />
            <Macro label="Fat" eaten={sum('fat')} target={profile.targets.fat} color={MACRO_COLORS.fat} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's meals</Text>
        <View style={styles.meals}>
          {MEAL_ORDER.map((m) => (
            <MealRow
              key={m}
              label={MEAL_LABELS[m]}
              color={colors.meals[m]}
              calories={byMeal[m] || undefined}
              detail={entriesFor(m)
                .map((e) => e.name)
                .join(', ')}
              onPress={() => openMeal(m)}
              onAdd={() => openMeal(m)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Macro({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) {
  const pct = Math.min(eaten / Math.max(target, 1), 1);
  return (
    <View style={styles.macro} accessibilityLabel={`${label}: ${eaten} of ${target} grams`}>
      <View style={styles.macroHead}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <Text style={styles.macroValue}>
        {eaten}
        <Text style={styles.macroTarget}> / {target}g</Text>
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg + 4, paddingTop: spacing.md, paddingBottom: spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  date: { ...type.label, color: colors.textMuted, fontWeight: '500' },
  greeting: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.3 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.background },

  plate: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eaten: { fontSize: 48, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  ofGoal: { ...type.body, color: colors.textMuted, marginTop: -2 },

  status: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statusOver: { backgroundColor: '#FBE3E0' },
  statusText: { ...type.label, fontSize: 14, color: colors.primary },
  statusTextOver: { color: colors.danger },

  macros: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macro: { flex: 1, gap: 4 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { ...type.caption, fontWeight: '600', color: colors.textMuted },
  macroValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  macroTarget: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden', marginTop: 2 },
  fill: { height: 6, borderRadius: 3 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  meals: { gap: spacing.sm + 2 },
});