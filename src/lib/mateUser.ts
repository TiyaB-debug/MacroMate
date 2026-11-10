import type { SwapUser } from '@/lib/ai';
import { useData } from '@/state/data';
import { Goal, useProfile } from '@/state/profile';

const GOAL_TEXT: Record<Goal, string> = {
  track: 'track food',
  lose: 'lose weight',
  maintain: 'maintain weight',
  gain: 'gain weight',
  muscle: 'build muscle',
  nutrition: 'improve nutrition',
  other: 'eat healthier',
  unsure: 'eat healthier',
};

// Onboarding answers that mean "nothing to avoid"
const realChoices = (list: string[]) => list.filter((x) => !['none', 'no preference', 'other'].includes(x.toLowerCase()));

/**
 * What Mate needs to know about the user for any AI request:
 * goals, diet, allergies, dislikes, and what's left of today's targets.
 */
export function useMateUser(): SwapUser {
  const { profile } = useProfile();
  const { log } = useData();

  const eaten = log.reduce(
    (t, e) => ({ calories: t.calories + e.calories, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const t = profile.targets;

  return {
    goal: profile.goals.length ? profile.goals.map((g) => GOAL_TEXT[g]).join(', ') : 'eat healthier',
    diet: realChoices(profile.diet),
    allergies: realChoices(profile.allergies),
    dislikes: profile.dislikes,
    remaining: {
      calories: Math.max(0, t.calories - eaten.calories),
      protein: Math.max(0, t.protein - eaten.protein),
      carbs: Math.max(0, t.carbs - eaten.carbs),
      fat: Math.max(0, t.fat - eaten.fat),
    },
  };
}