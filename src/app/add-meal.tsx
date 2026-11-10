import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/form';
import { Card, Screen, ScreenHeader } from '@/components/ui';
import { AIBusyError, parseIngredients, recalc, type Per100g } from '@/lib/ai';
import { useData } from '@/state/data';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, radius, spacing, type } from '@/theme';

type RowMacros = { protein: number; carbs: number; fat: number };
type Row = {
  name: string;
  amount: string;
  calories: string;
  per100g?: Per100g; // set when Mate filled this row, so editing grams can recalculate
  macros?: RowMacros;
  notFound?: boolean; // Mate couldn't match it in USDA, user must type calories
};
const emptyRow = (): Row => ({ name: '', amount: '', calories: '' });
const emptyRows = (): Row[] => [emptyRow(), emptyRow(), emptyRow()];

const WARN = '#B45309';
const ERROR = '#B42318';
const round1 = (x: number) => Math.round(x * 10) / 10;

/** "100", "100 g", "100g" -> 100. Anything else (e.g. "1 cup") -> null */
function parseGrams(amount: string) {
  const m = amount.match(/^\s*(\d+(?:\.\d+)?)\s*g?\s*$/i);
  return m ? parseFloat(m[1]) : null;
}

/**
 * "Add Breakfast" (or Lunch / Dinner / Snacks).
 * Users can describe the meal in plain words and Mate fills in the rows
 * (Gemini estimates grams, USDA supplies the nutrition), or type rows by hand.
 */
export default function AddMeal() {
  const params = useLocalSearchParams<{ meal?: string }>();
  const meal: MealType = MEAL_ORDER.includes(params.meal as MealType) ? (params.meal as MealType) : 'breakfast';
  const { log, recipes, addLogEntries, removeLogEntry } = useData();

  const [mode, setMode] = useState<'ingredients' | 'recipe' | null>(null);
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [describe, setDescribe] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [aiError, setAiError] = useState('');

  // Fresh form each time the screen opens
  useFocusEffect(
    useCallback(() => {
      setRows(emptyRows());
      setMode(null);
      setDescribe('');
      setAiError('');
    }, [meal]),
  );

  const entries = log.filter((e) => e.meal === meal);
  const total = entries.reduce((s, e) => s + e.calories, 0);
  const filled = rows.filter((r) => r.name.trim());
  const canSave = filled.length > 0 && filled.every((r) => parseInt(r.calories, 10) >= 0);

  const draftTotals = filled.reduce(
    (t, r) => ({
      calories: t.calories + (parseInt(r.calories, 10) || 0),
      protein: t.protein + (r.macros?.protein ?? 0),
      carbs: t.carbs + (r.macros?.carbs ?? 0),
      fat: t.fat + (r.macros?.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const updateRow = (i: number, fn: (r: Row) => Row) => setRows((rs) => rs.map((r, j) => (j === i ? fn(r) : r)));

  // Editing grams on a Mate row recalculates calories + macros instantly (no server call)
  const setAmount = (i: number, amount: string) =>
    updateRow(i, (r) => {
      const grams = parseGrams(amount);
      if (!r.per100g || grams === null) return { ...r, amount };
      const m = recalc(grams, r.per100g);
      return { ...r, amount, calories: String(m.kcal), macros: { protein: m.protein, carbs: m.carbs, fat: m.fat } };
    });

  // Typing calories by hand overrides the estimate; scale macros to match
  const setCalories = (i: number, raw: string) =>
    updateRow(i, (r) => {
      const calories = raw.replace(/[^0-9]/g, '');
      const oldCal = parseInt(r.calories, 10);
      const newCal = parseInt(calories, 10);
      let macros = r.macros;
      if (macros && oldCal > 0 && newCal >= 0) {
        const f = newCal / oldCal;
        macros = { protein: round1(macros.protein * f), carbs: round1(macros.carbs * f), fat: round1(macros.fat * f) };
      }
      return { ...r, calories, macros, per100g: undefined, notFound: false };
    });

  const estimate = async () => {
    if (!describe.trim() || estimating) return;
    setEstimating(true);
    setAiError('');
    try {
      const foods = await parseIngredients(describe);
      if (!foods.length) {
        setAiError('Mate couldn\'t find any foods in that. Try something like "2 eggs and toast".');
        return;
      }
      const newRows: Row[] = foods.map((f) =>
        f.found
          ? {
              name: f.name,
              amount: `${f.grams} g`,
              calories: String(f.kcal),
              per100g: f.per100g,
              macros: { protein: f.protein, carbs: f.carbs, fat: f.fat },
            }
          : { name: f.name, amount: `${f.grams} g`, calories: '', notFound: true },
      );
      // Keep anything the user already typed, replace the empty rows
      setRows((rs) => [...rs.filter((r) => r.name.trim()), ...newRows]);
      setDescribe('');
    } catch (e) {
      setAiError(e instanceof AIBusyError ? e.message : 'Couldn\'t estimate that. Try again or fill in the rows yourself.');
    } finally {
      setEstimating(false);
    }
  };

  const saveIngredients = () => {
    addLogEntries(
      filled.map((r) => ({
        meal,
        name: r.amount.trim() ? `${r.name.trim()} (${r.amount.trim()})` : r.name.trim(),
        calories: parseInt(r.calories, 10) || 0,
        protein: round1(r.macros?.protein ?? 0),
        carbs: round1(r.macros?.carbs ?? 0),
        fat: round1(r.macros?.fat ?? 0),
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
              <Text style={styles.caption}>Describe your meal or log specific foods.</Text>
            </View>
          </Pressable>

          {mode === 'ingredients' ? (
            <>
              {/* Describe it in plain words, Mate fills in the rows */}
              <View style={styles.describeBox}>
                <View style={styles.describeHeader}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                  <Text style={styles.cardTitle}>Describe it</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.describeInput]}
                  value={describe}
                  onChangeText={setDescribe}
                  placeholder="e.g. 2 eggs, 5 grapes, toast with butter"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  editable={!estimating}
                />
                {estimating ? (
                  <View style={styles.estimating}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.caption}>Mate is estimating…</Text>
                  </View>
                ) : (
                  <Button title="Estimate with Mate" onPress={estimate} disabled={!describe.trim()} />
                )}
                {aiError ? <Text style={[styles.caption, { color: ERROR }]}>{aiError}</Text> : null}
              </View>

              <View style={styles.rowHeader}>
                <Text style={[styles.caption, { flex: 2 }]}>Ingredient</Text>
                <Text style={[styles.caption, { flex: 1.2 }]}>Amount</Text>
                <Text style={[styles.caption, { flex: 1 }]}>Calories</Text>
              </View>
              {rows.map((r, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, { flex: 2 }]}
                      value={r.name}
                      onChangeText={(name) => updateRow(i, (row) => ({ ...row, name }))}
                      placeholder="Ingredient name"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1.2 }]}
                      value={r.amount}
                      onChangeText={(amount) => setAmount(i, amount)}
                      placeholder="Amount"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }, r.notFound && !r.calories ? styles.inputWarn : null]}
                      value={r.calories}
                      onChangeText={(c) => setCalories(i, c)}
                      placeholder="cal"
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  {r.notFound && !r.calories ? (
                    <Text style={[styles.rowNote, { color: WARN }]}>Couldn&apos;t find this one. Enter calories yourself.</Text>
                  ) : r.macros ? (
                    <Text style={styles.rowNote}>
                      P {round1(r.macros.protein)}g · C {round1(r.macros.carbs)}g · F {round1(r.macros.fat)}g
                      {r.per100g ? ' · estimate' : ''}
                    </Text>
                  ) : null}
                </View>
              ))}
              <Pressable onPress={() => setRows((rs) => [...rs, emptyRow()])} accessibilityRole="button">
                <Text style={styles.link}>+ Add another</Text>
              </Pressable>

              {filled.length ? (
                <View style={styles.draftTotal}>
                  <Text style={styles.cardTitle}>Total: {draftTotals.calories} cal</Text>
                  <Text style={styles.caption}>
                    P {round1(draftTotals.protein)}g · C {round1(draftTotals.carbs)}g · F {round1(draftTotals.fat)}g
                  </Text>
                </View>
              ) : null}

              <Button title="Save & update daily intake" onPress={saveIngredients} disabled={!canSave || estimating} />
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
  describeBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  describeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  describeInput: { minHeight: 64, textAlignVertical: 'top' },
  estimating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
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
  inputWarn: { borderWidth: 1, borderColor: WARN },
  rowNote: { ...type.caption, fontSize: 11, color: colors.textMuted, paddingHorizontal: spacing.xs },
  draftTotal: { gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
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