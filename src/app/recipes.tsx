import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, TextField } from '@/components/form';
import { RecipeCard } from '@/components/RecipeCard';
import { Chip, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { useData } from '@/state/data';
import { colors, MEAL_LABELS, MEAL_ORDER, MealType, spacing } from '@/theme';

type Filter = 'all' | 'favorites' | MealType;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'favorites', label: 'Favorites' },
  ...MEAL_ORDER.map((m) => ({ value: m as Filter, label: MEAL_LABELS[m] })),
];

export default function SavedRecipes() {
  const { recipes, toggleFavorite } = useData();
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const shown = recipes.filter((r) => {
    if (filter === 'favorites' && !r.favorite) return false;
    if (filter !== 'all' && filter !== 'favorites' && !r.mealTypes.includes(filter)) return false;
    if (q && !`${r.title} ${r.cuisine} ${r.tags.join(' ')} ${r.ingredients.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <Screen>
      <ScreenHeader
        title="Saved Recipes"
        subtitle={`${recipes.length} delicious meals to try`}
        back
        right={
          <Pressable
            style={styles.searchBtn}
            onPress={() => {
              setSearching((s) => !s);
              setQuery('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Search recipes"
          >
            <Ionicons name={searching ? 'close' : 'search'} size={18} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {searching ? (
          <TextField value={query} onChangeText={setQuery} placeholder="Search by name or ingredient" autoFocus icon="search" />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </ScrollView>
        <Button title="Add Recipe" icon="add" onPress={() => router.push('/add-recipe')} />
        {shown.length ? (
          shown.map((r) => <RecipeCard key={r.id} recipe={r} onToggleFavorite={() => toggleFavorite(r.id)} />)
        ) : (
          <EmptyState icon="restaurant-outline" title="No recipes here yet" message="Try another filter, or add one of your own." />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  filters: { gap: spacing.sm },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
