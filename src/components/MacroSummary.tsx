import { StyleSheet, Text, View } from 'react-native';

import { MacroRing } from '@/components/MacroRing';
import { Macros } from '@/state/data';
import { colors, spacing, type } from '@/theme';

// Protein / carbs / fat colors, matching the "Calculate per serving" ring in the design.
export const MACRO_COLORS = {
  protein: colors.meals.breakfast,
  carbs: colors.meals.lunch,
  fat: colors.meals.snacks,
};

/** Ring split by where the calories come from (4 cal/g protein & carbs, 9 cal/g fat). */
export function MacroRingForMacros({ macros, size = 120 }: { macros: Macros; size?: number }) {
  const p = macros.protein * 4;
  const c = macros.carbs * 4;
  const f = macros.fat * 9;
  const total = p + c + f;
  return (
    <MacroRing
      size={size}
      strokeWidth={size / 9}
      total={total || 1}
      segments={[
        { value: p, color: MACRO_COLORS.protein },
        { value: c, color: MACRO_COLORS.carbs },
        { value: f, color: MACRO_COLORS.fat },
      ]}
    >
      <Text style={[styles.cal, { fontSize: size / 5 }]}>{macros.calories}</Text>
      <Text style={styles.calLabel}>cal</Text>
    </MacroRing>
  );
}

export function MacroLegend({ macros }: { macros: Macros }) {
  const rows = [
    { label: 'protein', grams: macros.protein, color: MACRO_COLORS.protein },
    { label: 'carbs', grams: macros.carbs, color: MACRO_COLORS.carbs },
    { label: 'fat', grams: macros.fat, color: MACRO_COLORS.fat },
  ];
  return (
    <View style={{ gap: spacing.xs }}>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: r.color }]} />
          <Text style={styles.text}>
            <Text style={{ fontWeight: '700' }}>{r.grams}g</Text> {r.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cal: { fontWeight: '700', color: colors.text },
  calLabel: { ...type.caption, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { ...type.body, color: colors.text },
});
