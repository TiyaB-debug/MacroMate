import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button, FieldLabel, TextField } from '@/components/form';
import { MacroLegend, MacroRingForMacros } from '@/components/MacroSummary';
import { Card, Chip, Screen, ScreenHeader } from '@/components/ui';
import { AIBusyError, parseIngredients } from '@/lib/ai';
import { newId, Recipe, useData } from '@/state/data';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, radius, spacing, type } from '@/theme';

const PRESET_TAGS = ['High Protein', 'Vegetarian', 'Ready in 30', 'Using pantry staples'];
type Source = 'type' | 'link' | 'photo';

/** Split the ingredients box into clean lines ("- 2 eggs" -> "2 eggs") */
const toLines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/**
 * "Add a recipe — this will become part of your library".
 * "Calculate with Mate" fills in nutrition per serving from the ingredient list
 * (Gemini estimates grams, USDA supplies nutrition via the parse-ingredients function).
 * Macros can still be typed or edited by hand.
 */
export default function AddRecipeRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Start with a fresh form each time the screen is opened
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));
  return <AddRecipeForm key={`${id ?? 'new'}-${visit}`} editId={id} />;
}

function AddRecipeForm({ editId }: { editId?: string }) {
  const { recipes, saveRecipe } = useData();
  const existing = recipes.find((r) => r.id === editId);

  const [source, setSource] = useState<Source>('type');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [servings, setServings] = useState(existing ? String(existing.servings) : '');
  const [minutes, setMinutes] = useState(existing ? String(existing.minutes) : '');
  const [cuisine, setCuisine] = useState(existing?.cuisine ?? '');
  const [mealTypes, setMealTypes] = useState<MealType[]>(existing?.mealTypes ?? []);
  const [ingredients, setIngredients] = useState(existing?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(existing?.steps ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [customTag, setCustomTag] = useState('');
  const [macros, setMacros] = useState({
    calories: existing ? String(existing.macros.calories) : '',
    protein: existing ? String(existing.macros.protein) : '',
    carbs: existing ? String(existing.macros.carbs) : '',
    fat: existing ? String(existing.macros.fat) : '',
  });
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcNote, setCalcNote] = useState('');
  const [calcWarn, setCalcWarn] = useState('');

  const num = (s: string) => Math.max(0, parseInt(s, 10) || 0);
  const parsedMacros = {
    protein: num(macros.protein),
    carbs: num(macros.carbs),
    fat: num(macros.fat),
    calories: num(macros.calories),
  };
  // If calories are left blank, work them out from the macros
  const computedCalories = parsedMacros.protein * 4 + parsedMacros.carbs * 4 + parsedMacros.fat * 9;
  const finalMacros = { ...parsedMacros, calories: parsedMacros.calories || computedCalories };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setCustomTag('');
  };

  // Ask Mate for the whole recipe's nutrition, then divide by servings
  const calculate = async () => {
    const lines = toLines(ingredients);
    if (!lines.length) {
      setCalcNote('');
      setCalcWarn('Add your ingredients first (one per line).');
      return;
    }
    const text = lines.join('\n');
    if (text.length > 1000) {
      setCalcNote('');
      setCalcWarn('That ingredient list is too long for Mate. Try shortening it.');
      return;
    }

    setCalculating(true);
    setCalcNote('');
    setCalcWarn('');
    try {
      const foods = await parseIngredients(text);
      const found = foods.filter((f) => f.found);
      const missing = foods.filter((f) => !f.found).map((f) => f.name);

      if (!found.length) {
        setCalcWarn("Mate couldn't match any of these ingredients. Enter the nutrition yourself.");
        return;
      }

      const totals = found.reduce(
        (t, f) => (f.found ? { calories: t.calories + f.kcal, protein: t.protein + f.protein, carbs: t.carbs + f.carbs, fat: t.fat + f.fat } : t),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      const serv = num(servings) || 1;
      const per = (x: number) => String(Math.round(x / serv));
      setMacros({ calories: per(totals.calories), protein: per(totals.protein), carbs: per(totals.carbs), fat: per(totals.fat) });

      setCalcNote(
        `Estimated from ${found.length} ingredient${found.length === 1 ? '' : 's'} for ${serv} serving${serv === 1 ? '' : 's'}` +
          `${num(servings) ? '' : ' (set Servings above if this makes more)'}. Edit any number if it looks off.`,
      );
      if (missing.length) setCalcWarn(`Couldn't find: ${missing.join(', ')}. The numbers may be a bit low.`);
    } catch (e) {
      setCalcWarn(e instanceof AIBusyError ? e.message : "Couldn't calculate right now. Try again or enter it yourself.");
    } finally {
      setCalculating(false);
    }
  };

  const save = (draft: boolean) => {
    const ingredientList = toLines(ingredients);
    if (!title.trim()) return setError('Give your recipe a name.');
    if (!draft && !ingredientList.length) return setError('Add at least one ingredient (one per line).');
    setError('');

    const recipe: Recipe = {
      id: existing?.id ?? newId(),
      title: title.trim(),
      minutes: num(minutes) || 30,
      cuisine: cuisine.trim() || 'Homemade',
      servings: num(servings) || 1,
      mealTypes: mealTypes.length ? mealTypes : ['dinner'],
      tags,
      ingredients: ingredientList,
      steps: steps.trim(),
      macros: finalMacros,
      favorite: existing?.favorite ?? false,
      draft,
    };
    saveRecipe(recipe);
    router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  };

  return (
    <Screen>
      <ScreenHeader title={existing ? 'Edit recipe' : 'Add a recipe'} subtitle="This will become part of your library" back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.chips}>
          <Chip label="Type or Paste" selected={source === 'type'} onPress={() => setSource('type')} />
          <Chip label="Paste a Link" selected={source === 'link'} onPress={() => setSource('link')} />
          <Chip label="Photo of recipe" selected={source === 'photo'} onPress={() => setSource('photo')} />
        </View>

        {source !== 'type' ? (
          <Card>
            <Text style={styles.body}>
              {source === 'link'
                ? 'Importing from a link needs the AI recipe parser, which comes with the Supabase backend.'
                : 'Reading a photo of a recipe needs the AI recipe parser, which comes with the Supabase backend.'}{' '}
              For now, use "Type or Paste" and paste the recipe text in.
            </Text>
          </Card>
        ) : (
          <>
            <View style={styles.panel}>
              <View>
                <FieldLabel>Recipe name</FieldLabel>
                <TextField value={title} onChangeText={setTitle} placeholder="e.g. Chicken stir fry" />
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Servings</FieldLabel>
                  <TextField value={servings} onChangeText={setServings} keyboardType="number-pad" placeholder="2" />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Time to make</FieldLabel>
                  <TextField value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="30" suffix="min" />
                </View>
              </View>
              <View>
                <FieldLabel>Cuisine (optional)</FieldLabel>
                <TextField value={cuisine} onChangeText={setCuisine} placeholder="e.g. Italian" />
              </View>
              <View>
                <FieldLabel>Good for</FieldLabel>
                <View style={styles.chips}>
                  {MEAL_ORDER.map((m) => (
                    <Chip key={m} label={MEAL_LABELS[m]} selected={mealTypes.includes(m)} onPress={() => setMealTypes(toggle(mealTypes, m))} />
                  ))}
                </View>
              </View>
              <View>
                <FieldLabel>Ingredients (one per line)</FieldLabel>
                <TextField
                  value={ingredients}
                  onChangeText={setIngredients}
                  multiline
                  placeholder={'2 chicken breasts\n1 cup rice\n1 head broccoli'}
                  style={styles.multiline}
                />
              </View>
              <View>
                <FieldLabel>Steps</FieldLabel>
                <TextField value={steps} onChangeText={setSteps} multiline placeholder="How do you make it?" style={styles.multiline} />
              </View>
              <View>
                <FieldLabel>Tags</FieldLabel>
                <View style={styles.chips}>
                  {[...PRESET_TAGS, ...tags.filter((t) => !PRESET_TAGS.includes(t))].map((t) => (
                    <Chip key={t} small label={t} selected={tags.includes(t)} onPress={() => setTags(toggle(tags, t))} />
                  ))}
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  <TextField
                    value={customTag}
                    onChangeText={setCustomTag}
                    placeholder="+ Custom tag"
                    onSubmitEditing={addCustomTag}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Nutrition per serving</Text>
              {calculating ? (
                <View style={styles.calculating}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.note}>Mate is calculating…</Text>
                </View>
              ) : (
                <Button title="Calculate with Mate" variant="light" onPress={calculate} />
              )}
              {calcNote ? <Text style={styles.note}>{calcNote}</Text> : null}
              {calcWarn ? <Text style={styles.warn}>{calcWarn}</Text> : null}
              <View style={styles.row}>
                {(['protein', 'carbs', 'fat'] as const).map((k) => (
                  <View key={k} style={{ flex: 1 }}>
                    <FieldLabel>{k[0].toUpperCase() + k.slice(1)}</FieldLabel>
                    <TextField
                      value={macros[k]}
                      onChangeText={(v) => setMacros((m) => ({ ...m, [k]: v.replace(/[^0-9]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="0"
                      suffix="g"
                    />
                  </View>
                ))}
              </View>
              <View>
                <FieldLabel>Calories</FieldLabel>
                <TextField
                  value={macros.calories}
                  onChangeText={(v) => setMacros((m) => ({ ...m, calories: v.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder={computedCalories ? `${computedCalories} (from macros)` : 'Leave blank to calculate'}
                  suffix="cal"
                />
              </View>
              {finalMacros.calories > 0 ? (
                <View style={styles.preview}>
                  <MacroRingForMacros macros={finalMacros} size={96} />
                  <MacroLegend macros={finalMacros} />
                </View>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="Save as Draft" variant="light" onPress={() => save(true)} />
              </View>
              <View style={{ flex: 1.3 }}>
                <Button title={existing ? 'Save changes' : 'Add as my Recipe'} onPress={() => save(false)} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  panel: { backgroundColor: colors.surfaceMuted, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg },
  panelTitle: { ...type.heading, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.md },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  body: { ...type.body, color: colors.text, lineHeight: 21 },
  error: { ...type.label, color: '#B3261E' },
  calculating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  note: { ...type.caption, color: colors.textMuted },
  warn: { ...type.caption, color: '#B45309' },
});