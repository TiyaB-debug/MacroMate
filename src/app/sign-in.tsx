import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/form';
import { useProfile } from '../state/profile';
import { colors, radius, spacing, type } from '../theme';

/**
 * Sign up / log in. Accounts aren't real yet: this will call Supabase Auth
 * (signUp / signInWithPassword) once the backend is connected.
 */
export default function SignInScreen() {
  const { update } = useProfile();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  const switchMode = (m: 'signup' | 'signin') => {
    setMode(m);
    setError('');
  };

  const submit = () => {
    if (isSignup && !firstName.trim()) return setError('Enter your first name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    setError('');
    update({ email: email.trim(), firstName: firstName.trim() || 'there' });
    router.replace({ pathname: '/welcome', params: { next: isSignup ? 'onboarding' : 'home' } });
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
            <View style={styles.hero}>
              <BrandMark size={120} />
              <Text style={styles.wordmark}>MacroMate</Text>
              <Text style={styles.tagline}>Know what's on your plate.</Text>
            </View>

            <View style={styles.sheet}>
              <View style={styles.segment} accessibilityRole="tablist">
                {(['signup', 'signin'] as const).map((m) => {
                  const active = mode === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => switchMode(m)}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {m === 'signup' ? 'Sign up' : 'Log in'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sheetTitle}>{isSignup ? 'Create your account' : 'Welcome back'}</Text>

              <View style={styles.fields}>
                {isSignup ? (
                  <Field
                    onEdit={() => setError('')}
                    icon="person-outline"
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    autoComplete="given-name"
                    textContentType="givenName"
                  />
                ) : null}
                <Field
                  onEdit={() => setError('')}
                  icon="mail-outline"
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Field
                  onEdit={() => setError('')}
                  icon="lock-closed-outline"
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignup ? 'Password (8+ characters)' : 'Password'}
                  secureTextEntry={!showPassword}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  textContentType={isSignup ? 'newPassword' : 'password'}
                  onSubmitEditing={submit}
                  trailing={
                    <Pressable
                      onPress={() => setShowPassword((s) => !s)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                    </Pressable>
                  }
                />
              </View>

              {error ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={{ marginTop: spacing.xl }}>
                <Button title={isSignup ? 'Create account' : 'Log in'} onPress={submit} />
              </View>

              <Pressable onPress={() => switchMode(isSignup ? 'signin' : 'signup')} style={styles.switch} accessibilityRole="button">
                <Text style={styles.switchText}>
                  {isSignup ? 'Already have an account? ' : 'New to MacroMate? '}
                  <Text style={styles.switchLink}>{isSignup ? 'Log in' : 'Sign up'}</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  icon,
  label,
  trailing,
  onEdit,
  ...input
}: TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  trailing?: React.ReactNode;
  /** Called on every keystroke (used to clear the error message). */
  onEdit?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textMuted} />
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        onChangeText={(t) => {
          onEdit?.();
          input.onChangeText?.(t);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl },
  wordmark: { fontSize: 36, fontWeight: '800', color: colors.primary, marginTop: spacing.lg, letterSpacing: -0.5 },
  tagline: { ...type.body, fontSize: 16, color: colors.text, marginTop: spacing.xs },

  sheet: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl * 1.5,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { ...type.label, fontSize: 14, color: colors.textMuted },
  segmentTextActive: { color: colors.textOnPrimary },

  sheetTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.xl },
  fields: { gap: spacing.md, marginTop: spacing.lg },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#F4F6EE',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  input: {
    flex: 1,
    height: '100%',
    ...type.body,
    fontSize: 16,
    color: colors.text,
    // The field's green border shows focus; hide the browser's extra outline on web
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },

  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  errorText: { ...type.label, color: colors.danger, flex: 1 },

  switch: { alignItems: 'center', marginTop: spacing.lg, paddingVertical: spacing.sm },
  switchText: { ...type.body, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '700' },
});