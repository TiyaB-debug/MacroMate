import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/form';
import { Card } from '@/components/ui';
import { AIBusyError, applyDeltas, suggestSwaps, type MacroSet, type SwapResult } from '@/lib/ai';
import { newId, Recipe, useData } from '@/state/data';
import { Goal, useProfile } from '@/state/profile';
import { colors, radius, spacing, type } from '@/theme';

const WARN = '#B45309';
const GOOD = '#2E7D32';

const GOAL_TEXT: Record<Goal, string> = {
  track: 'track food',
  lose: 'lose weight',
  maintain: 'maintain weight',
  gain: 'gain weight',
  muscle: 'build muscle',
  nutrition: 'improve nutrition',
  other: 'eat healthier',
  unsure: 'eat healthier',
};

// Onboarding answers that mean "nothing to avoid"
const realChoices = (list: string[]) => list.filter((x) => !['none', 'no preference', 'other'].includes(x.toLowerCase()));

const r1 = (x: number) => Math.round(x * 10) / 10;

/** "−120 cal · +8g protein · −10g carbs" (only the parts that actually change) */
function deltaText(d: MacroSet) {
  const sign = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '');
  const parts: string[] = [];
  if (Math.abs(d.kcal) >= 1) parts.push(`${sign(d.kcal)}${Math.abs(Math.round(d.kcal))} cal`);
  if (Math.abs(d.protein) >= 0.5) parts.push(`${sign(d.protein)}${Math.abs(Math.round(d.protein))}g protein`);
  if (Math.abs(d.carbs) >= 0.5) parts.push(`${sign(d.carbs)}${Math.abs(Math.round(d.carbs))}g carbs`);
  if (Math.abs(d.fat) >= 0.5) parts.push(`${sign(d.fat)}${Math.abs(Math.round(d.fat))}g fat`);
  return parts.length ? parts.join(' · ') : 'About the same nutrition';
}

/**
 * "Make it healthier" card on the recipe page.
 * Mate suggests swaps (Gemini), the server removes anything unsafe for the user and
 * prices each swap with real USDA numbers. The user picks which swaps to keep;
 * nothing changes unless they save.
 */
export function HealthierSwaps({ recipe }: { recipe: Recipe }) {
  const { profile } = useProfile();
  const { log, saveRecipe } = useData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SwapResult | null>(null);
  const [picked, setPicked] = useState<boolean[]>([]);

  if (!recipe.ingredients.length) return null;

  const ask = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // What's left today, so Mate can aim swaps at it
      const eaten = log.reduce(
        (t, e) => ({ calories: t.calories + e.calories, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );
      const t = profile.targets;
      const res = await suggestSwaps(
        { title: recipe.title, servings: recipe.servings, ingredients: recipe.ingredients },
        {
          goal: profile.goals.length ? profile.goals.map((g) => GOAL_TEXT[g]).join(', ') : 'eat healthier',
          diet: realChoices(profile.diet),
          allergies: realChoices(profile.allergies),
          dislikes: profile.dislikes,
          remaining: {
            calories: Math.max(0, t.calories - eaten.calories),
            protein: Math.max(0, t.protein - eaten.protein),
            carbs: Math.max(0, t.carbs - eaten.carbs),
            fat: Math.max(0, t.fat - eaten.fat),
          },
        },
      );
      setResult(res);
      setPicked(res.swaps.map(() => true));
    } catch (e) {
      setError(e instanceof AIBusyError ? e.message : "Couldn't get swap ideas right now. Try again in a bit.");
    } finally {
      setLoading(false);
    }
  };

  // Before/after uses the recipe's own saved numbers plus the real change of each picked swap
  const base: MacroSet = {
    kcal: recipe.macros.calories,
    protein: recipe.macros.protein,
    carbs: recipe.macros.carbs,
    fat: recipe.macros.fat,
  };
  const chosen = result ? result.swaps.filter((_, i) => picked[i]) : [];
  const after = applyDeltas(base, chosen);

  const buildRecipe = (asCopy: boolean): Recipe => {
    const replace = new Map(chosen.map((s) => [s.original, s.replacement]));
    return {
      ...recipe,
      id: asCopy ? newId() : recipe.id,
      title: asCopy ? `${recipe.title} (healthier)` : recipe.title,
      favorite: asCopy ? false : recipe.favorite,
      ingredients: recipe.ingredients.map((l) => replace.get(l) ?? l),
      macros: {
        calories: Math.max(0, Math.round(after.kcal)),
        protein: Math.max(0, Math.round(after.protein)),
        carbs: Math.max(0, Math.round(after.carbs)),
        fat: Math.max(0, Math.round(after.fat)),
      },
      tags: recipe.tags.includes('Mate swap') ? recipe.tags : [...recipe.tags, 'Mate swap'],
    };
  };

  const saveCopy = () => {
    const copy = buildRecipe(true);
    saveRecipe(copy);
    router.replace({ pathname: '/recipe/[id]', params: { id: copy.id } });
  };

  const updateThis = () => {
    saveRecipe(buildRecipe(false));
    setResult(null);
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <Text style={styles.section}>Make it healthier</Text>
      </View>

      {!result && !loading ? (
        <>
          <Text style={styles.caption}>
            Mate suggests a few swaps that fit your goals, allergies, and what you have left today. You choose what to keep.
          </Text>
          {error ? <Text style={[styles.caption, { color: WARN }]}>{error}</Text> : null}
          <Button title={error ? 'Try again' : 'Suggest swaps'} variant="soft" icon="sparkles-outline" onPress={ask} />
        </>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.caption}>Mate is looking for swaps…</Text>
        </View>
      ) : null}

      {result ? (
        <>
          {result.summary ? <Text style={styles.body}>{result.summary}</Text> : null}

          {result.allergenWarnings.length ? (
            <View style={styles.warnBox}>
              <Ionicons name="warning-outline" size={16} color={WARN} />
              <Text style={[styles.caption, { color: WARN, flex: 1 }]}>
                Heads up, this recipe may contain your allergens: {result.allergenWarnings.join('; ')}
              </Text>
            </View>
          ) : null}

          {result.swaps.length === 0 ? (
            <Text style={styles.caption}>No swaps needed. This recipe already fits your goals well.</Text>
          ) : (
            result.swaps.map((s, i) => (
              <Pressable
                key={s.original}
                style={[styles.swap, picked[i] && styles.swapPicked]}
                onPress={() => setPicked((p) => p.map((v, j) => (j === i ? !v : v)))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!picked[i] }}
              >
                <Ionicons
                  name={picked[i] ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={picked[i] ? colors.primary : colors.textMuted}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.original}>{s.original}</Text>
                  <Text style={styles.replacement}>→ {s.replacement}</Text>
                  {s.reason ? <Text style={styles.caption}>{s.reason}</Text> : null}
                  <Text style={[styles.delta, { color: s.delta.kcal <= 0 ? GOOD : colors.textMuted }]}>
                    {deltaText(s.delta)} per serving{s.uncertain ? ' (rough estimate)' : ''}
                  </Text>
                </View>
              </Pressable>
            ))
          )}

          {result.blocked > 0 ? (
            <Text style={styles.caption}>
              Mate skipped {result.blocked} idea{result.blocked === 1 ? '' : 's'} that didn&apos;t fit your allergies, diet, or dislikes.
            </Text>
          ) : null}

          {result.swaps.length ? (
            <>
              <View style={styles.compare}>
                <Text style={styles.caption}>Per serving</Text>
                <Text style={styles.compareText}>
                  {base.kcal} → {Math.max(0, Math.round(after.kcal))} cal · {Math.round(base.protein)} →{' '}
                  {Math.max(0, Math.round(after.protein))}g protein
                </Text>
              </View>
              <Button title="Save as new recipe" onPress={saveCopy} disabled={!chosen.length} />
              <Button title="Update this recipe" variant="light" onPress={updateThis} disabled={!chosen.length} />
            </>
          ) : null}

          <Pressable onPress={() => setResult(null)} accessibilityRole="button">
            <Text style={styles.link}>{result.swaps.length ? 'Keep original' : 'Close'}</Text>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  section: { ...type.heading, color: colors.text },
  body: { ...type.body, color: colors.text, lineHeight: 21 },
  caption: { ...type.caption, color: colors.textMuted },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  warnBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: WARN,
  },
  swap: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapPicked: { borderColor: colors.primary, backgroundColor: '#F1F7EF' },
  original: { ...type.caption, color: colors.textMuted, textDecorationLine: 'line-through' },
  replacement: { ...type.body, fontWeight: '600', color: colors.text },
  delta: { ...type.label, marginTop: 2 },
  compare: { gap: 2, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  compareText: { ...type.body, fontWeight: '700', color: colors.text },
  link: { ...type.label, color: colors.primary, textAlign: 'center' },
});
