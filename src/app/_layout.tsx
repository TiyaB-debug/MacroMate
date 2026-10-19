import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataProvider } from '../state/data';
import { ProfileProvider } from '../state/profile';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <DataProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="recipes" />
            <Stack.Screen name="recipe/[id]" />
            <Stack.Screen name="add-recipe" />
            <Stack.Screen name="pantry" />
            <Stack.Screen name="create-from-pantry" />
            <Stack.Screen name="add-meal" />
          </Stack>
        </DataProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}