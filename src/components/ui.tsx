import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type } from '@/theme';

/** Green full-height screen. Pass `tab` for screens inside the tab bar (it handles the bottom inset). */
export function Screen({ children, tab }: { children: ReactNode; tab?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={tab ? ['top'] : ['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/menu'))}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** White rounded card. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Small pill. `selected` = dark filled (filters); otherwise white or tinted. */
export function Chip({
  label,
  selected,
  onPress,
  tint,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tint?: string;
  small?: boolean;
}) {
  const content = (
    <Text style={[small ? styles.chipTextSmall : styles.chipText, selected && { color: colors.surface }]}>{label}</Text>
  );
  const style = [
    styles.chip,
    small && styles.chipSmall,
    { backgroundColor: selected ? colors.primary : tint ?? colors.surface },
  ];
  return onPress ? (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

export function EmptyState({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={colors.text} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  back: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.pill },
  chipSmall: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  chipText: { ...type.label, color: colors.text },
  chipTextSmall: { fontSize: 11, fontWeight: '500', color: colors.text },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...type.heading, color: colors.text },
  emptyMsg: { ...type.body, color: colors.textMuted, textAlign: 'center' },
});
