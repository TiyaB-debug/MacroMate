import { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, TextField } from '@/components/form';
import { RecipeCard } from '@/components/RecipeCard';
import { Card, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { matchRecipe, Recipe, useData } from '@/state/data';
import { useProfile } from '@/state/profile';
import { colors, spacing, type } from '@/theme';

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

/**
 * "Create from Pantry". This first version ranks your saved recipes by how much
 * of each one you already have, with no AI needed. Generating brand-new recipes
 * with Claude can be added later via the Supabase edge function.
 */
export default function CreateFromPantry() {
  const { recipes, pantry } = useData();
  const { profile } = useProfile();
  const [cuisine, setCuisine] = useState('');
  const [include, setInclude] = useState('');
  const [avoid, setAvoid] = useState('');
  const [other, setOther] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);

  const run = () => {
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
          <TextField value={other} onChangeText={setOther} placeholder="e.g. quick, high protein, comfort" />
        </Question>
        <Text style={styles.note}>Your allergies, diet and disliked foods from setup are always excluded.</Text>

        <Button title="Create Recipe" onPress={run} />

        {results ? (
          results.length ? (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.resultsTitle}>Best matches</Text>
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
                          You'll need: {r.missing.join(', ')}
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
                title="No matches"
                message="None of your saved recipes fit. Try fewer filters or add more recipes."
              />
            </Card>
          )
        ) : null}
      </ScrollView>
    </Screen>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  q: { ...type.body, fontWeight: '600', color: colors.text },
  note: { ...type.caption, color: colors.textMuted },
  resultsTitle: { ...type.heading, color: colors.text },
  match: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
  matchStrong: { ...type.label, color: colors.primary },
  matchText: { ...type.caption, color: colors.textMuted },
});
