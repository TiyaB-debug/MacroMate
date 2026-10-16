import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors } from '@/theme';

export type RingSegment = { value: number; color: string };

type Props = {
  segments: RingSegment[];
  /** The full circle represents this amount (e.g. the daily calorie goal). */
  total: number;
  size?: number;
  strokeWidth?: number;
  /** Shown in the middle of the ring. */
  children?: ReactNode;
};

/**
 * Segmented donut ring. Segments are drawn clockwise from the top, each taking
 * a share of the circle proportional to value / total. Whatever is left over
 * shows as the faint track (the gap at the top in the design).
 *
 * Used for the daily calorie ring (one segment per meal) and the per-serving
 * macro ring on "Add a recipe" (protein / carbs / fat).
 */
export function MacroRing({ segments, total, size = 220, strokeWidth = 16, children }: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  let start = 0;
  const arcs = segments.map((seg, i) => {
    const remaining = Math.max(c - start, 0);
    const length = Math.min((seg.value / Math.max(total, 1)) * c, remaining);
    const arc = { key: i, color: seg.color, length, start };
    start += length;
    return arc;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Rotate so drawing starts at 12 o'clock instead of 3 o'clock */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={r} stroke={colors.ringTrack} strokeWidth={strokeWidth} fill="none" />
          {arcs.map((a) =>
            a.length > 0 ? (
              <Circle
                key={a.key}
                cx={center}
                cy={center}
                r={r}
                stroke={a.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${a.length} ${c}`}
                strokeDashoffset={-a.start}
              />
            ) : null,
          )}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
