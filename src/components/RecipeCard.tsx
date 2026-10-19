import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from './ui';
import { Recipe } from '../state/data';
import { colors, radius, spacing, type } from '../theme';

/** Recipe card from the "Saved Recipes" design: title, time • cuisine, tags, heart. */
export function RecipeCard({
  recipe,
  onToggleFavorite,
  footer,
  onPress,
}: {
  recipe: Recipe;
  onToggleFavorite?: () => void;
  footer?: ReactNode;
  onPress?: () => void;
}) {
  const extra = recipe.tags.find((t) => !['Healthy', 'Easy', 'Comfort', 'Fresh'].includes(t));
  return (
    // The heart is a separate button laid over the card (not inside it): a button
    // inside a button isn't allowed on web and breaks screen readers.
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
        onPress={onPress ?? (() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } }))}
        accessibilityRole="button"
        accessibilityLabel={recipe.title}
      >
        <View style={onToggleFavorite ? styles.titleWithHeart : undefined}>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.meta}>
            {recipe.minutes} mins • {extra ?? recipe.cuisine} • {recipe.macros.calories} cal
          </Text>
        </View>
        <View style={styles.tags}>
          {recipe.draft ? <Chip small label="Draft" tint={colors.surfaceMuted} /> : null}
          {recipe.tags.slice(0, 3).map((t) => (
            <Chip key={t} small label={t} tint={colors.surfaceMuted} />
          ))}
        </View>
        {footer}
      </Pressable>
      {onToggleFavorite ? (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={10}
          style={styles.heart}
          accessibilityRole="button"
          accessibilityLabel={recipe.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons name={recipe.favorite ? 'heart' : 'heart-outline'} size={18} color={recipe.favorite ? colors.primary : colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  titleWithHeart: { paddingRight: 44 },
  title: { ...type.body, fontWeight: '700', color: colors.text },
  meta: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  heart: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});