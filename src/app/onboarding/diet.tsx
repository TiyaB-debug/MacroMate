import { router } from 'expo-router';

import { CheckboxGroup } from '@/components/form';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { useProfile } from '@/state/profile';

const OPTIONS = ['No preference', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Other'];

// "Dietary Preferences" — used to filter recipe suggestions.
export default function Diet() {
  const { profile, update } = useProfile();
  return (
    <OnboardingLayout
      title="Dietary Preferences"
      subtitle="Let's make recipes work for you."
      step={3}
      onContinue={() => router.push('/onboarding/allergies')}
    >
      <CheckboxGroup
        options={OPTIONS}
        selected={profile.diet}
        onChange={(diet) => update({ diet })}
        exclusive="No preference"
      />
    </OnboardingLayout>
  );
}
