import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type } from '../theme';

type Props = {
  label: string;
  color: string; // this meal's color in the calorie ring
  calories?: number;
  /** What was logged, e.g. "Greek Yogurt Parfait, Coffee". */
  detail?: string;
  onPress?: () => void;
  onAdd?: () => void;
};

/** A meal on the Home screen: color tab matching its ring segment, what was eaten, and a "+" to log more. */
export function MealRow({ label, color, calories, detail, onPress, onAdd }: Props) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${calories ? `${calories} calories` : 'nothing logged'}`}
      >
        <View style={[styles.tab, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.detail} numberOfLines={1}>
            {detail || 'Nothing logged yet'}
          </Text>
        </View>
        {calories ? (
          <Text style={styles.calories}>
            {calories}
            <Text style={styles.unit}> cal</Text>
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onAdd}
        hitSlop={6}
        style={({ pressed }) => [styles.add, pressed && { transform: [{ scale: 0.92 }] }]}
        accessibilityRole="button"
        accessibilityLabel={`Add to ${label}`}
      >
        <Ionicons name="add" size={22} color={colors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingRight: spacing.md,
    minHeight: 68,
    overflow: 'hidden',
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingRight: spacing.md },
  tab: { width: 6, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4, marginVertical: -spacing.md },
  label: { ...type.body, fontSize: 16, fontWeight: '700', color: colors.text },
  detail: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  calories: { fontSize: 16, fontWeight: '700', color: colors.text },
  unit: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});