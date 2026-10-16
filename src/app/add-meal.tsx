import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/form';
import { Card, Screen, ScreenHeader } from '@/components/ui';
import { useData } from '@/state/data';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, radius, spacing, type } from '@/theme';

type Row = { name: string; amount: string; calories: string };
const emptyRows = (): Row[] => [0, 1, 2].map(() => ({ name: '', amount: '', calories: '' }));

/**
 * "Add Breakfast" (or Lunch / Dinner / Snacks).
 * Individual ingredients take calories typed by hand for now; the USDA lookup
 * will fill these in automatically once the backend is connected.
 */
export default function AddMeal() {
  const params = useLocalSearchParams<{ meal?: string }>();
  const meal: MealType = MEAL_ORDER.includes(params.meal as MealType) ? (params.meal as MealType) : 'breakfast';
  const { log, recipes, addLogEntries, removeLogEntry } = useData();

  const [mode, setMode] = useState<'ingredients' | 'recipe' | null>(null);
  const [rows, setRows] = useState<Row[]>(emptyRows);

  // Fresh form each time the screen opens
  useFocusEffect(
    useCallback(() => {
      setRows(emptyRows());
      setMode(null);
    }, [meal]),
  );

  const entries = log.filter((e) => e.meal === meal);
  const total = entries.reduce((s, e) => s + e.calories, 0);
  const filled = rows.filter((r) => r.name.trim());
  const canSave = filled.length > 0 && filled.every((r) => parseInt(r.calories, 10) >= 0);

  const setRow = (i: number, changes: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...changes } : r)));

  const saveIngredients = () => {
    addLogEntries(
      filled.map((r) => ({
        meal,
        name: r.amount.trim() ? `${r.name.trim()} (${r.amount.trim()})` : r.name.trim(),
        calories: parseInt(r.calories, 10) || 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      })),
    );
    router.dismissTo('/home');
  };

  const logRecipe = (id: string) => {
    const r = recipes.find((x) => x.id === id)!;
    addLogEntries([{ meal, name: r.title, recipeId: r.id, ...r.macros }]);
    router.dismissTo('/home');
  };

  const suggested = [...recipes.filter((r) => !r.draft)].sort(
    (a, b) => Number(b.mealTypes.includes(meal)) - Number(a.mealTypes.includes(meal)) || Number(b.favorite) - Number(a.favorite),
  );

  return (
    <Screen>
      <ScreenHeader title={`Add ${MEAL_LABELS[meal]}`} subtitle="How would you like to add?" back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {entries.length ? (
          <Card style={{ gap: spacing.xs }}>
            <View style={styles.loggedHeader}>
              <Text style={styles.cardTitle}>Logged today</Text>
              <Text style={styles.cardTitle}>{total} cal</Text>
            </View>
            {entries.map((e) => (
              <View key={e.id} style={styles.loggedRow}>
                <Text style={styles.loggedName} numberOfLines={1}>
                  {e.name}
                </Text>
                <Text style={styles.loggedCal}>{e.calories} cal</Text>
                <Pressable onPress={() => removeLogEntry(e.id)} hitSlop={10} accessibilityLabel={`Remove ${e.name}`}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Pressable style={styles.option} onPress={() => setMode(mode === 'ingredients' ? null : 'ingredients')} accessibilityRole="button">
            <View style={styles.optionIcon}>
              <Ionicons name="add" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Add Individual Ingredients</Text>
              <Text style={styles.caption}>Log specific foods with measurements.</Text>
            </View>
          </Pressable>

          {mode === 'ingredients' ? (
            <>
              <View style={styles.rowHeader}>
                <Text style={[styles.caption, { flex: 2 }]}>Ingredient</Text>
                <Text style={[styles.caption, { flex: 1.2 }]}>Amount</Text>
                <Text style={[styles.caption, { flex: 1 }]}>Calories</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    value={r.name}
                    onChangeText={(name) => setRow(i, { name })}
                    placeholder="Ingredient name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1.2 }]}
                    value={r.amount}
                    onChangeText={(amount) => setRow(i, { amount })}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={r.calories}
                    onChangeText={(c) => setRow(i, { calories: c.replace(/[^0-9]/g, '') })}
                    placeholder="cal"
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}
              <Pressable onPress={() => setRows((rs) => [...rs, { name: '', amount: '', calories: '' }])} accessibilityRole="button">
                <Text style={styles.link}>+ Add another</Text>
              </Pressable>
              <Button title="Save & update daily intake" onPress={saveIngredients} disabled={!canSave} />
            </>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Pressable style={styles.option} onPress={() => setMode(mode === 'recipe' ? null : 'recipe')} accessibilityRole="button">
            <View style={styles.optionIcon}>
              <Ionicons name="book-outline" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Directly Add a Recipe</Text>
              <Text style={styles.caption}>Search and add a saved recipe.</Text>
            </View>
            <Ionicons name={mode === 'recipe' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textMuted} />
          </Pressable>

          {mode === 'recipe'
            ? suggested.map((r) => (
                <Pressable key={r.id} style={styles.recipeRow} onPress={() => logRecipe(r.id)} accessibilityRole="button">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loggedName}>{r.title}</Text>
                    <Text style={styles.caption}>
                      1 serving • {r.macros.calories} cal • {r.macros.protein}g protein
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </Pressable>
              ))
            : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  cardTitle: { ...type.body, fontWeight: '700', color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHeader: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: '#F4F7F3',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    ...type.caption,
    fontSize: 13,
    color: colors.text,
    minWidth: 0,
  },
  link: { ...type.label, color: colors.primary },
  loggedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  loggedName: { ...type.body, color: colors.text, flex: 1 },
  loggedCal: { ...type.label, color: colors.textMuted },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
