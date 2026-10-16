import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

// Everything collected during sign-up and onboarding.
// Lives in memory for now; will be saved to the Supabase `profiles` table later.

export type Sex = 'female' | 'male';
export type Goal =
  | 'track'
  | 'lose'
  | 'maintain'
  | 'gain'
  | 'muscle'
  | 'nutrition'
  | 'other'
  | 'unsure';

export type Targets = { calories: number; protein: number; carbs: number; fat: number };

export type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  sex: Sex;
  gender: string;
  weight: number; // in weightUnit
  weightUnit: 'lbs' | 'kg';
  heightFt: number;
  heightIn: number;
  heightCm: number;
  metricHeight: boolean;
  goals: Goal[];
  diet: string[];
  allergies: string[];
  dislikes: string[];
  targetMode: 'suggest' | 'manual';
  targets: Targets;
};

const DEFAULT_PROFILE: Profile = {
  firstName: '',
  lastName: '',
  email: '',
  age: 21,
  sex: 'female',
  gender: '',
  weight: 145,
  weightUnit: 'lbs',
  heightFt: 5,
  heightIn: 6,
  heightCm: 168,
  metricHeight: false,
  goals: [],
  diet: ['No preference'],
  allergies: ['None'],
  dislikes: [],
  targetMode: 'suggest',
  targets: { calories: 2000, protein: 150, carbs: 200, fat: 67 },
};

/**
 * Suggested daily targets using the Mifflin-St Jeor equation with a light
 * activity multiplier, adjusted for the user's weight goal.
 * Macros split 30% protein / 40% carbs / 30% fat.
 */
export function suggestTargets(p: Profile): Targets {
  const kg = p.weightUnit === 'kg' ? p.weight : p.weight * 0.453592;
  const cm = p.metricHeight ? p.heightCm : (p.heightFt * 12 + p.heightIn) * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  let calories = bmr * 1.375;

  if (p.goals.includes('lose')) calories -= 500;
  else if (p.goals.includes('gain') || p.goals.includes('muscle')) calories += 300;

  calories = Math.max(1200, Math.round(calories / 10) * 10);
  return {
    calories,
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.4) / 4),
    fat: Math.round((calories * 0.3) / 9),
  };
}

type ProfileContextValue = {
  profile: Profile;
  update: (changes: Partial<Profile>) => void;
  reset: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const value = useMemo(
    () => ({
      profile,
      update: (changes: Partial<Profile>) => setProfile((p) => ({ ...p, ...changes })),
      reset: () => setProfile(DEFAULT_PROFILE),
    }),
    [profile],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
