import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, TextField } from '@/components/form';
import { RecipeCard } from '@/components/RecipeCard';
import { Card, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { AIBusyError, createPantryRecipes, type GeneratedRecipe } from '@/lib/ai';
import { useMateUser } from '@/lib/mateUser';
import { matchRecipe, newId, PantryItem, Recipe, useData, usesItem } from '@/state/data';
import { useProfile } from '@/state/profile';
import { colors, radius, spacing, type } from '@/theme';

// Ingredient words to rule out for each allergy and diet chosen in onboarding.
const ALLERGY_WORDS: Record<string, string[]> = {
  Dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'parmesan', 'feta', 'mozzarella'],
  Eggs: ['egg'],
  Peanuts: ['peanut'],
  'Tree nuts': ['walnut', 'almond', 'cashew', 'pecan', 'pistachio', 'hazelnut'],
  'Gluten/wheat': ['bread', 'pasta', 'spaghetti', 'flour', 'wheat', 'granola', 'noodle'],
  Soy: ['soy', 'tofu', 'edamame'],
  Shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'clam', 'mussel'],
};
const MEAT = ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'steak'];
const FISH = ['salmon', 'tuna', 'fish', 'cod', 'shrimp', 'tilapia'];
const DIET_WORDS: Record<string, string[]> = {
  Vegetarian: [...MEAT, ...FISH],
  Vegan: [...MEAT, ...FISH, ...ALLERGY_WORDS.Dairy, 'egg', 'honey'],
  Pescatarian: MEAT,
  Halal: ['pork', 'bacon', 'ham', 'wine'],
  Kosher: ['pork', 'bacon', 'ham', 'shrimp', 'crab', 'lobster'],
};

const terms = (s: string) => s.toLowerCase().split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
const mentions = (r: Recipe, word: string) => `${r.title} ${r.ingredients.join(' ')}`.toLowerCase().includes(word.replace(/s$/, ''));

type Result = { recipe: Recipe; have: string[]; missing: string[]; score: number };
type AIState = { status: 'idle' | 'loading' | 'done' | 'error'; recipes: GeneratedRecipe[]; blocked: number; error: string };

/**
 * "Create from Pantry".
 * Mate creates brand-new recipes from what's in the pantry and the user's craving
 * (Gemini writes them, code removes anything unsafe, USDA supplies nutrition).
 * Saved recipes are also ranked by how much of each one the user already has (no AI needed).
 */
export default function CreateFromPantry() {
  const { recipes, pantry } = useData();
  const { profile } = useProfile();
  const mateUser = useMateUser();
  const [cuisine, setCuisine] = useState('');
  const [include, setInclude] = useState('');
  const [avoid, setAvoid] = useState('');
  const [other, setOther] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [ai, setAi] = useState<AIState>({ status: 'idle', recipes: [], blocked: 0, error: '' });

  // Instant: rank the user's saved recipes
  const rankSaved = () => {
    const avoidWords = [
      ...terms(avoid),
      ...profile.dislikes.map((d) => d.toLowerCase()),
      ...profile.allergies.flatMap((a) => ALLERGY_WORDS[a] ?? []),
      ...profile.diet.flatMap((d) => DIET_WORDS[d] ?? []),
    ];
    const cuisines = terms(cuisine);
    const includes = terms(include);
    const prefs = terms(other);

    const ranked = recipes
      .filter((r) => !r.draft && !avoidWords.some((w) => mentions(r, w)))
      .map((r) => {
        const m = matchRecipe(r, pantry);
        let score = m.score;
        if (cuisines.some((c) => r.cuisine.toLowerCase().includes(c))) score += 0.3;
        score += includes.filter((i) => mentions(r, i)).length * 0.25;
        for (const p of prefs) {
          if ((p.includes('quick') || p.includes('fast')) && r.minutes <= 30) score += 0.2;
          if (r.tags.some((t) => t.toLowerCase().includes(p))) score += 0.2;
        }
        return { recipe: r, ...m, score };
      })
      .filter((x) => x.have.length > 0 || includes.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setResults(ranked);
  };

  // A few seconds: Mate creates new recipes
  const askMate = async () => {
    if (!pantry.length) {
      setAi({ status: 'error', recipes: [], blocked: 0, error: 'Add a few items to your pantry first, then Mate can cook with them.' });
      return;
    }
    setAi({ status: 'loading', recipes: [], blocked: 0, error: '' });
    try {
      const res = await createPantryRecipes(
        pantry.map((p) => p.name),
        { cuisine, include, avoid, other },
        mateUser,
      );
      setAi({ status: 'done', recipes: res.recipes, blocked: res.blocked, error: '' });
    } catch (e) {
      setAi({
        status: 'error',
        recipes: [],
        blocked: 0,
        error: e instanceof AIBusyError ? e.message : "Mate couldn't create a recipe right now. Try again in a bit.",
      });
    }
  };

  const run = () => {
    rankSaved();
    askMate();
  };

  return (
    <Screen>
      <ScreenHeader title="Create from Pantry" subtitle="Tell us what you're in the mood for and we'll suggest a recipe." back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Question n={1} label="Which cuisine are you craving?">
          <TextField value={cuisine} onChangeText={setCuisine} placeholder="e.g. Italian, Mexican, Mediterranean" />
        </Question>
        <Question n={2} label="Which ingredients would you like to include?">
          <TextField value={include} onChangeText={setInclude} placeholder="e.g. chicken, sweet potatoes, avocado" />
        </Question>
        <Question n={3} label="Which ingredients would you like to avoid?">
          <TextField value={avoid} onChangeText={setAvoid} placeholder="e.g. gluten, dairy, nuts" />
        </Question>
        <Question n={4} label="Any other preferences?">
          <TextField value={other} onChangeText={setOther} placeholder="e.g. quick, high protein, something warm and spicy" />
        </Question>
        <Text style={styles.note}>Your allergies, diet and disliked foods from setup are always excluded.</Text>

        <Button title={ai.status === 'loading' ? 'Mate is cooking…' : 'Create Recipe'} onPress={run} disabled={ai.status === 'loading'} />

        {/* Mate's brand-new recipes */}
        {ai.status !== 'idle' ? (
          <View style={{ gap: spacing.md }}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <Text style={styles.resultsTitle}>Mate&apos;s new recipes</Text>
            </View>

            {ai.status === 'loading' ? (
              <Card style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.note}>Mate is creating recipes from your pantry…</Text>
              </Card>
            ) : null}

            {ai.status === 'error' ? (
              <Card style={{ gap: spacing.md }}>
                <Text style={[styles.note, { color: WARN }]}>{ai.error}</Text>
                {pantry.length ? <Button title="Try again" variant="soft" onPress={askMate} /> : null}
              </Card>
            ) : null}

            {ai.status === 'done' && !ai.recipes.length ? (
              <Card style={{ gap: spacing.md }}>
                <Text style={styles.note}>
                  Mate couldn&apos;t make something that fits everything you asked for. Try loosening a preference.
                </Text>
                <Button title="Try again" variant="soft" onPress={askMate} />
              </Card>
            ) : null}

            {ai.recipes.map((g, i) => (
              <GeneratedRecipeCard key={`${g.title}-${i}`} recipe={g} pantry={pantry} />
            ))}

            {ai.status === 'done' && ai.blocked > 0 ? (
              <Text style={styles.note}>
                Mate skipped {ai.blocked} idea{ai.blocked === 1 ? '' : 's'} that didn&apos;t fit your allergies, diet, or foods to avoid.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Ranked saved recipes (no AI) */}
        {results ? (
          results.length ? (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.resultsTitle}>From your saved recipes</Text>
              {results.map((r) => (
                <RecipeCard
                  key={r.recipe.id}
                  recipe={r.recipe}
                  footer={
                    <View style={styles.match}>
                      <Text style={styles.matchStrong}>
                        You have {r.have.length} of {r.recipe.ingredients.length} ingredients
                      </Text>
                      {r.missing.length ? (
                        <Text style={styles.matchText} numberOfLines={2}>
                          You&apos;ll need: {r.missing.join(', ')}
                        </Text>
                      ) : (
                        <Text style={styles.matchText}>You have everything!</Text>
                      )}
                    </View>
                  }
                />
              ))}
            </View>
          ) : (
            <Card>
              <EmptyState
                icon="search-outline"
                title="No saved matches"
                message="None of your saved recipes fit. Try fewer filters or add more recipes."
              />
            </Card>
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** One of Mate's new recipes: preview it, then save it to the library */
function GeneratedRecipeCard({ recipe, pantry }: { recipe: GeneratedRecipe; pantry: PantryItem[] }) {
  const { saveRecipe } = useData();
  const [showSteps, setShowSteps] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const inPantry = (line: string) => pantry.some((p) => usesItem(line, p.name));
  const haveCount = recipe.ingredients.filter(inPantry).length;
  const m = recipe.macros;

  const save = () => {
    const id = newId();
    saveRecipe({
      id,
      title: recipe.title,
      minutes: recipe.minutes,
      cuisine: recipe.cuisine,
      servings: recipe.servings,
      mealTypes: recipe.mealTypes,
      tags: recipe.tags.includes('Mate recipe') ? recipe.tags : [...recipe.tags, 'Mate recipe'],
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      macros: m,
      favorite: false,
    });
    setSavedId(id);
    router.push({ pathname: '/recipe/[id]', params: { id } });
  };

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.cardTitle}>{recipe.title}</Text>
      <Text style={styles.note}>
        {recipe.minutes} mins • {recipe.cuisine} • {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}
      </Text>
      <Text style={styles.macros}>
        {m.calories} cal · P {m.protein}g · C {m.carbs}g · F {m.fat}g per serving{recipe.uncertain ? ' (rough estimate)' : ''}
      </Text>
      <Text style={styles.matchStrong}>
        You have {haveCount} of {recipe.ingredients.length} ingredients
      </Text>

      <View style={styles.ingredients}>
        {recipe.ingredients.map((line) => {
          const have = inPantry(line);
          return (
            <View key={line} style={styles.ingRow}>
              <Ionicons
                name={have ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={have ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.ingText, !have && { color: colors.textMuted }]}>{line}</Text>
            </View>
          );
        })}
      </View>

      <Pressable onPress={() => setShowSteps((s) => !s)} accessibilityRole="button">
        <Text style={styles.link}>{showSteps ? 'Hide steps' : 'Show steps'}</Text>
      </Pressable>
      {showSteps ? <Text style={styles.steps}>{recipe.steps}</Text> : null}

      {savedId ? (
        <Button
          title="Saved, view recipe"
          variant="light"
          icon="checkmark"
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: savedId } })}
        />
      ) : (
        <Button title="Save to my recipes" onPress={save} />
      )}
    </Card>
  );
}

function Question({ n, label, children }: { n: number; label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.q}>
        {n}. {label}
      </Text>
      {children}
    </View>
  );
}

const WARN = '#B45309';

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  q: { ...type.body, fontWeight: '600', color: colors.text },
  note: { ...type.caption, color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  resultsTitle: { ...type.heading, color: colors.text },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  cardTitle: { ...type.heading, color: colors.text },
  macros: { ...type.label, color: colors.text },
  ingredients: { gap: 4, paddingVertical: spacing.xs },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ingText: { ...type.body, color: colors.text, flex: 1 },
  steps: {
    ...type.body,
    color: colors.text,
    lineHeight: 21,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  link: { ...type.label, color: colors.primary },
  match: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
  matchStrong: { ...type.label, color: colors.primary },
  matchText: { ...type.caption, color: colors.textMuted },
});