import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type } from '@/theme';

type Props = {
  label: string;
  color: string;
  calories?: number;
  onPress?: () => void;
  onAdd?: () => void;
};

/** A colored meal pill with a "+" button beside it, as on the Home screen. */
export function MealRow({ label, color, calories, onPress, onAdd }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pill, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}${calories ? `, ${calories} calories` : ''}`}
      >
        <Text style={styles.label}>{label}</Text>
        {calories ? <Text style={styles.calories}>{calories} cal</Text> : null}
      </Pressable>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.add, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`Add to ${label}`}
      >
        <Ionicons name="add" size={22} color={colors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
  },
  label: { ...type.heading, color: colors.surface },
  calories: { ...type.label, color: colors.surface },
  add: {
    width: 48,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
