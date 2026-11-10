import { supabase } from "./supabase";

export type Per100g = { calories: number; protein: number; carbs: number; fat: number };
export type MacroSet = { kcal: number; protein: number; carbs: number; fat: number };

export type ParsedFood =
  | { name: string; grams: number; found: false }
  | ({ name: string; grams: number; found: true; usdaMatch: string; per100g: Per100g } & MacroSet);

export type Swap = {
  original: string; // the ingredient line being replaced
  replacement: string; // the new ingredient line
  reason: string;
  delta: MacroSet; // change per serving if this swap is accepted
  uncertain: boolean; // USDA couldn't find part of it, so the numbers are rougher
};

export type SwapResult = {
  summary: string;
  servings: number;
  before: MacroSet; // per serving, original recipe
  after: MacroSet; // per serving, if every swap is accepted
  swaps: Swap[];
  blocked: number; // suggestions removed by the allergy/diet safety check
  allergenWarnings: string[]; // original lines that may contain the user's allergens
};

export type SwapUser = {
  goal?: string;
  diet?: string[];
  allergies?: string[];
  dislikes?: string[];
  remaining?: { calories: number; protein: number; carbs: number; fat: number };
};

export class AIBusyError extends Error {}

// One place that calls our Supabase functions and turns failures into friendly errors
async function callFunction<T>(name: string, body: Record<string, unknown>, fallbackMessage: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const status = (error as any).context?.status;
    if (status === 503) throw new AIBusyError("Mate needs a sec, try again.");
    throw new Error(fallbackMessage);
  }
  return data as T;
}

// Sends messy text like "2 eggs, 5 grapes" to the server and gets back foods with macros
export async function parseIngredients(text: string): Promise<ParsedFood[]> {
  const data = await callFunction<{ items: ParsedFood[] }>(
    "parse-ingredients",
    { text },
    "Couldn't estimate that meal. Try again or enter it manually.",
  );
  return data.items;
}

// "Make it healthier": swap suggestions with real before/after nutrition per serving
export async function suggestSwaps(
  recipe: { title: string; servings: number; ingredients: string[] },
  user: SwapUser,
): Promise<SwapResult> {
  return callFunction<SwapResult>("suggest-swap", { recipe, user }, "Couldn't get swap ideas right now. Try again in a bit.");
}

export type PantryCraving = { cuisine: string; include: string; avoid: string; other: string };

export type GeneratedRecipe = {
  title: string;
  cuisine: string;
  minutes: number;
  servings: number;
  mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snacks')[];
  tags: string[];
  ingredients: string[];
  steps: string;
  macros: { calories: number; protein: number; carbs: number; fat: number }; // per serving, from USDA
  uncertain: boolean; // USDA couldn't find an ingredient, so the numbers are rougher
};

// "Create from Pantry": Mate invents new recipes from the pantry, safety-checked, with real nutrition
export async function createPantryRecipes(
  pantry: string[],
  craving: PantryCraving,
  user: SwapUser,
): Promise<{ recipes: GeneratedRecipe[]; blocked: number }> {
  return callFunction<{ recipes: GeneratedRecipe[]; blocked: number }>(
    "pantry-recipe",
    { pantry, craving, user },
    "Mate couldn't create a recipe right now. Try again in a bit.",
  );
}

// Recalculate macros when the user edits the grams (no server call needed)
export function recalc(grams: number, p: Per100g) {
  const f = grams / 100;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    kcal: Math.round(p.calories * f),
    protein: r1(p.protein * f),
    carbs: r1(p.carbs * f),
    fat: r1(p.fat * f),
  };
}

// Add up a base set of macros plus the deltas of the swaps the user accepted
export function applyDeltas(base: MacroSet, swaps: Swap[]): MacroSet {
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return swaps.reduce(
    (m, s) => ({
      kcal: m.kcal + s.delta.kcal,
      protein: r1(m.protein + s.delta.protein),
      carbs: r1(m.carbs + s.delta.carbs),
      fat: r1(m.fat + s.delta.fat),
    }),
    base,
  );
}
