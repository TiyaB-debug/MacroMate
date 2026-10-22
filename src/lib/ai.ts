import { supabase } from "./supabase";

export type Per100g = { calories: number; protein: number; carbs: number; fat: number };

export type ParsedFood =
  | { name: string; grams: number; found: false }
  | {
      name: string;
      grams: number;
      found: true;
      usdaMatch: string;
      per100g: Per100g;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    };

export class AIBusyError extends Error {}

// Sends messy text like "2 eggs, 5 grapes" to the server and gets back foods with macros
export async function parseIngredients(text: string): Promise<ParsedFood[]> {
  const { data, error } = await supabase.functions.invoke("parse-ingredients", {
    body: { text },
  });

  if (error) {
    const status = (error as any).context?.status;
    if (status === 503) throw new AIBusyError("Mate needs a sec, try again.");
    throw new Error("Couldn't estimate that meal. Try again or enter it manually.");
  }
  return data.items as ParsedFood[];
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