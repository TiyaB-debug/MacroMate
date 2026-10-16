import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button, FieldLabel, TextField } from '@/components/form';
import { useProfile } from '@/state/profile';
import { colors, radius, spacing, type } from '@/theme';

/**
 * Sign in / create account. The Figma frame was a placeholder, so this follows
 * the rest of the app's style. Accounts aren't real yet: this will call
 * Supabase Auth (signInWithPassword / signUp) once it's connected.
 */
export default function SignInScreen() {
  const { update } = useProfile();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  const submit = () => {
    if (isSignup && !firstName.trim()) return setError('Please enter your first name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError('');
    update({ email: email.trim(), firstName: isSignup ? firstName.trim() : firstName.trim() || 'there' });
    router.replace({ pathname: '/welcome', params: { next: isSignup ? 'onboarding' : 'home' } });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Ionicons name="leaf" size={36} color={colors.surface} />
          </View>
          <Text style={styles.title}>MacroMate</Text>
          <Text style={styles.subtitle}>{isSignup ? 'Create your account' : 'Welcome back'}</Text>

          <View style={styles.tabs}>
            {(['signup', 'signin'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setError('');
                }}
                style={[styles.tab, mode === m && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                  {m === 'signup' ? 'Sign up' : 'Log in'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            {isSignup ? (
              <View>
                <FieldLabel>First name</FieldLabel>
                <TextField value={firstName} onChangeText={setFirstName} placeholder="Your name" autoComplete="given-name" />
              </View>
            ) : null}
            <View>
              <FieldLabel>Email</FieldLabel>
              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            <View>
              <FieldLabel>Password</FieldLabel>
              <TextField
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={isSignup ? 'Create account' : 'Log in'} onPress={submit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: spacing.xxl * 1.5, alignItems: 'stretch' },
  logo: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.display, color: colors.text, textAlign: 'center', marginTop: spacing.lg, fontWeight: '700' },
  subtitle: { ...type.body, color: colors.text, textAlign: 'center', marginTop: spacing.xs },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: radius.pill,
    padding: 4,
    marginTop: spacing.xl,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...type.label, color: colors.textMuted },
  tabTextActive: { color: colors.text },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  error: { ...type.label, color: '#B3261E' },
});
