// MacroMate design tokens, taken from the Figma screens.
// Every screen should pull colors, spacing and type from here,
// so a change to the design happens in one place.

export const colors = {
  background: '#B0D2A8', // sage green used on every screen
  surface: '#FFFFFF', // cards, inputs, bottom nav
  surfaceMuted: '#D7E8D2', // light green panels (Add a recipe form)
  primary: '#24412F', // dark green buttons ("Add Recipe", "Save")
  textOnPrimary: '#FFFFFF',
  text: '#1E2E24', // headings and body text
  textMuted: '#5E6E63', // subtitles, helper text
  textOnBackground: '#FFFFFF', // large white headings on green screens
  danger: '#E57373', // "Delete Account"
  border: '#E3E8E1',

  // One color per meal, used in the calorie ring and meal rows
  meals: {
    breakfast: '#E8CDE8',
    lunch: '#F7DCA8',
    dinner: '#87CEEB',
    snacks: '#F2B097',
  },
  ringTrack: 'rgba(255,255,255,0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: '400' as const }, // "Welcome", onboarding headings
  title: { fontSize: 24, fontWeight: '700' as const }, // "My Pantry", "Saved Recipes"
  heading: { fontSize: 18, fontWeight: '700' as const }, // "Hey <name>"
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;

export type MealType = keyof typeof colors.meals;
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};
