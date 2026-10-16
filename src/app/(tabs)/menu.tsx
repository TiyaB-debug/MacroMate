import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Href, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen, ScreenHeader } from '@/components/ui';
import { useData } from '@/state/data';
import { colors, radius, spacing, type } from '@/theme';

type Item = { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; href: Href };

export default function MenuScreen() {
  const { recipes, pantry } = useData();
  const saved = recipes.filter((r) => !r.draft).length;

  const items: Item[] = [
    { title: 'Saved Recipes', subtitle: `${saved} recipes in your library`, icon: 'book-outline', href: '/recipes' },
    { title: 'Add a recipe', subtitle: 'Type or paste one of your own', icon: 'add-circle-outline', href: '/add-recipe' },
    { title: 'My Pantry', subtitle: `${pantry.length} ingredients on hand`, icon: 'basket-outline', href: '/pantry' },
    { title: 'Create from Pantry', subtitle: 'Find recipes you can make now', icon: 'sparkles-outline', href: '/create-from-pantry' },
  ];

  return (
    <Screen tab>
      <ScreenHeader title="Menu" subtitle="Recipes and your pantry" />
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((it) => (
          <Pressable
            key={it.title}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(it.href)}
            accessibilityRole="button"
          >
            <View style={styles.icon}>
              <Ionicons name={it.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{it.title}</Text>
              <Text style={styles.subtitle}>{it.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.body, fontWeight: '700', color: colors.text },
  subtitle: { ...type.caption, color: colors.textMuted, marginTop: 2 },
});
