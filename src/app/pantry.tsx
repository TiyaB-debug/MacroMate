import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, FieldLabel, Select, TextField } from '@/components/form';
import { Card, EmptyState, Screen, ScreenHeader } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { daysFromNow, daysUntil, formatExpiry, PANTRY_CATEGORIES, PantryCategory, useData } from '@/state/data';
import { colors, radius, spacing, type } from '@/theme';

// Emoji stand-ins for the food photos in the design.
const EMOJI: [RegExp, string][] = [
  [/salmon|fish|tuna|shrimp/, '🐟'], [/egg/, '🥚'], [/beef|steak|pork|lamb/, '🥩'], [/chicken|turkey/, '🍗'],
  [/tofu/, '🧈'], [/carrot/, '🥕'], [/broccoli/, '🥦'], [/onion/, '🧅'], [/garlic/, '🧄'], [/potato/, '🥔'],
  [/tomato/, '🍅'], [/pepper/, '🫑'], [/spinach|lettuce|kale/, '🥬'], [/mushroom/, '🍄'], [/avocado/, '🥑'],
  [/apple/, '🍎'], [/banana/, '🍌'], [/orange/, '🍊'], [/strawberr|berr/, '🍓'], [/lemon|lime/, '🍋'],
  [/milk/, '🥛'], [/cheese/, '🧀'], [/yogurt/, '🍶'], [/butter/, '🧈'], [/bread/, '🍞'], [/rice/, '🍚'],
  [/spaghetti|pasta|noodle/, '🍝'], [/oat|cereal|granola/, '🥣'],
];
const CATEGORY_EMOJI: Record<PantryCategory, string> = {
  Proteins: '🍗', Vegetables: '🥬', Fruits: '🍎', Dairy: '🥛', Grains: '🌾', Other: '🫙',
};
const emojiFor = (name: string, cat: PantryCategory) =>
  EMOJI.find(([re]) => re.test(name.toLowerCase()))?.[1] ?? CATEGORY_EMOJI[cat];

const EXPIRY_OPTIONS = [
  { label: 'In 3 days', value: 3 },
  { label: 'In 1 week', value: 7 },
  { label: 'In 2 weeks', value: 14 },
  { label: 'In 1 month', value: 30 },
  { label: 'In 3 months', value: 90 },
  { label: 'No expiry date', value: -1 },
];

export default function Pantry() {
  const { pantry, addPantryItem, removePantryItem } = useData();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PantryCategory>('Vegetables');
  const [expiresIn, setExpiresIn] = useState(7);
  const [collapsed, setCollapsed] = useState<Set<PantryCategory>>(new Set());

  const expiringSoon = pantry.filter((p) => {
    const d = daysUntil(p.expires);
    return d !== undefined && d <= 3;
  });

  const add = () => {
    if (!name.trim()) return;
    addPantryItem({ name: name.trim(), category, expires: expiresIn > 0 ? daysFromNow(expiresIn) : undefined });
    setName('');
    setAdding(false);
  };

  const remove = async (id: string, itemName: string) => {
    if (await confirm('Remove item', `Remove ${itemName} from your pantry?`, 'Remove', true)) removePantryItem(id);
  };

  const toggleCollapsed = (c: PantryCategory) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  return (
    <Screen>
      <ScreenHeader title="My Pantry" subtitle="Manage your ingredients by category" back />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {adding ? (
          <Card style={{ gap: spacing.md }}>
            <View>
              <FieldLabel>Ingredient</FieldLabel>
              <TextField value={name} onChangeText={setName} placeholder="e.g. Chicken breast" autoFocus onSubmitEditing={add} />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Category</FieldLabel>
                <Select value={category} options={PANTRY_CATEGORIES.map((c) => ({ label: c, value: c }))} onChange={setCategory} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Expires</FieldLabel>
                <Select value={expiresIn} options={EXPIRY_OPTIONS} onChange={setExpiresIn} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="light" onPress={() => setAdding(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Add" onPress={add} disabled={!name.trim()} />
              </View>
            </View>
          </Card>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Pressable style={styles.addBtn} onPress={() => setAdding(true)} accessibilityRole="button">
              <Ionicons name="add" size={16} color={colors.surface} />
              <Text style={styles.addText}>Add ingredients</Text>
            </Pressable>
          </View>
        )}

        {expiringSoon.length ? (
          <View style={styles.alert}>
            <Ionicons name="time-outline" size={18} color="#8A4B00" />
            <Text style={styles.alertText}>
              Use soon: {expiringSoon.map((p) => p.name).join(', ')}
            </Text>
          </View>
        ) : null}

        {pantry.length === 0 ? (
          <EmptyState icon="basket-outline" title="Your pantry is empty" message="Add what you have at home to get recipe ideas." />
        ) : null}

        {PANTRY_CATEGORIES.map((cat) => {
          const items = pantry.filter((p) => p.category === cat);
          if (!items.length) return null;
          const isCollapsed = collapsed.has(cat);
          return (
            <Card key={cat} style={{ paddingVertical: spacing.md }}>
              <Pressable style={styles.catHeader} onPress={() => toggleCollapsed(cat)} accessibilityRole="button">
                <Text style={styles.catTitle}>
                  {cat} <Text style={styles.count}>({items.length})</Text>
                </Text>
                <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={colors.text} />
              </Pressable>
              {!isCollapsed &&
                items.map((item) => {
                  const d = daysUntil(item.expires);
                  const soon = d !== undefined && d <= 3;
                  return (
                    <View key={item.id} style={styles.item}>
                      <View style={styles.emoji}>
                        <Text style={{ fontSize: 18 }}>{emojiFor(item.name, item.category)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={[styles.expiry, soon && { color: '#B3261E', fontWeight: '600' }]}>
                          {formatExpiry(item.expires)}
                        </Text>
                      </View>
                      <Pressable onPress={() => remove(item.id, item.name)} hitSlop={10} style={styles.trash} accessibilityLabel={`Remove ${item.name}`}>
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  );
                })}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  addText: { ...type.label, color: colors.surface },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: '#FBE7C6',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertText: { ...type.label, color: '#8A4B00', flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  catTitle: { ...type.body, fontWeight: '700', color: colors.text },
  count: { fontWeight: '400', color: colors.textMuted },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  emoji: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { ...type.body, color: colors.text },
  expiry: { ...type.caption, color: colors.textMuted },
  trash: { padding: spacing.xs },
});
