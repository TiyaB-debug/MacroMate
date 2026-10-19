import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Href, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, type } from '../theme';

type Bubble = { label: string; icon: keyof typeof Ionicons.glyphMap; href: Href; x: number; y: number };

// Arc of four bubbles above the Menu button. x/y are offsets from the button (y = up).
const BUBBLES: Bubble[] = [
  { label: 'Saved\nRecipes', icon: 'book', href: '/recipes', x: -126, y: 44 },
  { label: 'Add a\nRecipe', icon: 'add-circle', href: '/add-recipe', x: -46, y: 124 },
  { label: 'My\nPantry', icon: 'basket', href: '/pantry', x: 46, y: 124 },
  { label: 'Create from\nPantry', icon: 'sparkles', href: '/create-from-pantry', x: 126, y: 44 },
];

const TAB_BAR_HEIGHT = 49;
// The native animation driver doesn't exist on web; use it only on phones
const NATIVE = Platform.OS !== 'web';
const SIZE = 64;

/** The Menu tab's pop-out: four bubbles spring out of the tab bar in an arc. */
export function MenuBubbles({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  // One value per bubble so they pop out one after another
  const pops = useRef(BUBBLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 180 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE,
    }).start();
    const anims = pops.map((v) =>
      open
        ? Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: NATIVE })
        : Animated.timing(v, { toValue: 0, duration: 120, useNativeDriver: NATIVE }),
    );
    Animated.stagger(open ? 40 : 0, open ? anims : [...anims].reverse()).start();
  }, [open, progress, pops]);

  const go = (href: Href) => {
    onClose();
    router.push(href);
  };

  const bottom = TAB_BAR_HEIGHT + insets.bottom;

  return (
    // Covers everything above the tab bar, so the Menu button stays tappable to close
    <View style={[styles.overlay, { bottom }]} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      <View style={[styles.anchor, { bottom: 8 }]} pointerEvents="box-none">
        {BUBBLES.map((b, i) => {
          const v = pops[i];
          return (
            <Animated.View
              key={b.label}
              style={[
                styles.bubbleWrap,
                {
                  opacity: v,
                  transform: [
                    { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, b.x] }) },
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -b.y] }) },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => go(b.href)}
                style={({ pressed }) => [styles.bubble, pressed && { transform: [{ scale: 0.92 }] }]}
                accessibilityRole="button"
                accessibilityLabel={b.label.replace('\n', ' ')}
              >
                <Ionicons name={b.icon} size={26} color={colors.primary} />
              </Pressable>
              <Text style={styles.label}>{b.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  backdrop: { backgroundColor: 'rgba(20, 45, 28, 0.55)' },
  anchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center', height: 0 },
  bubbleWrap: { position: 'absolute', bottom: -SIZE / 2, alignItems: 'center', width: 110 },
  bubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: { ...type.caption, fontWeight: '700', color: colors.surface, textAlign: 'center', marginTop: 6 },
});