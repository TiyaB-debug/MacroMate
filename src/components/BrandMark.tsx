import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MacroRing } from './MacroRing';
import { colors, MEAL_ORDER } from '../theme';

/** MacroMate's mark: the leaf on a "plate" ringed by the four meal colors. */
export function BrandMark({ size = 112 }: { size?: number }) {
  const inner = size * 0.62;
  return (
    <MacroRing
      size={size}
      strokeWidth={size * 0.09}
      gap={size * 0.05}
      total={4}
      segments={MEAL_ORDER.map((m) => ({ value: 1, color: colors.meals[m] }))}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="leaf" size={inner * 0.48} color={colors.background} />
      </View>
    </MacroRing>
  );
}