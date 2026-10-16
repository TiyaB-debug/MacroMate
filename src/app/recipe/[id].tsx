import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/form';
import { MacroLegend, MacroRingForMacros } from '@/components/MacroSummary';
import { Card, Chip, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { useData, usesItem } from '@/state/data';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, radius, spacing, type } from '@/theme';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, pantry, toggleFavorite, addLogEntries } = useData();
  const recipe = recipes.find((r) => r.id === id);
  const [meal, setMeal] = useState<MealType>(recipe?.mealTypes[0] ?? 'lunch');
  const [servings, setServings] = useState(1);

  if (!recipe) {
    return (
      <Screen>
        <ScreenHeader title="Recipe" back />
        <EmptyState icon="alert-circle-outline" title="Recipe not found" message="It may have been removed." />
      </Screen>
    );
  }

  const logIt = () => {
    const m = recipe.macros;
    addLogEntries([
      {
        meal,
        name: servings === 1 ? recipe.title : `${recipe.title} (×${servings})`,
        recipeId: recipe.id,
        calories: Math.round(m.calories * servings),
        protein: Math.round(m.protein * servings),
        carbs: Math.round(m.carbs * servings),
        fat: Math.round(m.fat * servings),
      },
    ]);
    router.dismissTo('/home');
  };

  return (
    <Screen>
      <ScreenHeader
        title={recipe.title}
        subtitle={`${recipe.minutes} mins • ${recipe.cuisine} • serves ${recipe.servings}`}
        back
        right={
          <Pressable onPress={() => toggleFavorite(recipe.id)} hitSlop={10} accessibilityLabel="Favorite">
            <Ionicons name={recipe.favorite ? 'heart' : 'heart-outline'} size={24} color={recipe.favorite ? '#D9534F' : colors.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tags}>
          {recipe.draft ? <Chip small label="Draft" tint="#F7DCA8" /> : null}
          {recipe.tags.map((t) => (
            <Chip key={t} small label={t} />
          ))}
        </View>

        <Card style={styles.macroCard}>
          <MacroRingForMacros macros={recipe.macros} size={110} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Per serving</Text>
            <MacroLegend macros={recipe.macros} />
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>Ingredients</Text>
          {recipe.ingredients.map((ing) => {
            const have = pantry.some((p) => usesItem(ing, p.name));
            return (
              <View key={ing} style={styles.ingRow}>
                <Ionicons name={have ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={have ? colors.primary : colors.textMuted} />
                <Text style={styles.ingText}>{ing}</Text>
              </View>
            );
          })}
          <Text style={styles.hint}>✓ = in your pantry</Text>
        </Card>

        {recipe.steps ? (
          <Card>
            <Text style={styles.section}>Steps</Text>
            <Text style={styles.steps}>{recipe.steps}</Text>
          </Card>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Text style={styles.section}>Log this meal</Text>
          <View style={styles.tags}>
            {MEAL_ORDER.map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} tint={colors.surfaceMuted} onPress={() => setMeal(m)} />
            ))}
          </View>
          <View style={styles.stepper}>
            <Text style={styles.ingText}>Servings</Text>
            <View style={styles.stepperControls}>
              <Pressable style={styles.stepBtn} onPress={() => setServings((s) => Math.max(0.5, s - 0.5))} accessibilityLabel="Fewer servings">
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <Text style={styles.servings}>{servings}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setServings((s) => s + 0.5)} accessibilityLabel="More servings">
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>
          <Button title={`Log ${Math.round(recipe.macros.calories * servings)} cal to ${MEAL_LABELS[meal]}`} onPress={logIt} />
          <Button
            title="Edit recipe"
            variant="light"
            onPress={() => router.push({ pathname: '/add-recipe', params: { id: recipe.id } })}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  macroCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  cardLabel: { ...type.label, color: colors.textMuted, marginBottom: spacing.xs },
  section: { ...type.heading, color: colors.text, marginBottom: spacing.sm },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  ingText: { ...type.body, color: colors.text, flex: 1 },
  hint: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  steps: { ...type.body, color: colors.text, lineHeight: 22 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servings: { ...type.heading, color: colors.text, minWidth: 28, textAlign: 'center' },
});
