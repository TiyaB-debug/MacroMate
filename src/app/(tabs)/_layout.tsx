import { useState } from 'react';
import { View } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MenuBubbles } from '../../components/MenuBubbles';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color as string} />;
}

// Bottom nav from the design: Home / Menu / Profile.
// Tapping Menu doesn't change screens; it pops out four bubbles (see MenuBubbles).
export default function TabsLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
        // Tapping Home or Profile closes the bubbles; the Menu tab toggles them itself
        screenListeners={({ route }) => ({
          tabPress: () => {
            if (route.name !== 'menu') setMenuOpen(false);
          },
        })}
      >
        <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
        <Tabs.Screen
          name="menu"
          options={{
            title: menuOpen ? 'Close' : 'Menu',
            tabBarIcon: ({ size }) => (
              <View
                style={{
                  width: size + 8,
                  height: size + 8,
                  borderRadius: (size + 8) / 2,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={menuOpen ? 'close' : 'menu'} size={size - 4} color={colors.surface} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMenuOpen((o) => !o);
            },
          }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
      </Tabs>
      <MenuBubbles open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}