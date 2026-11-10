// Shared helpers for MacroMate's AI functions (parse-ingredients, suggest-swap, ...)
// Gemini handles language. USDA supplies the numbers. Plain code does the math and the safety checks.

export type Per100g = { calories: number; protein: number; carbs: number; fat: number };
export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export type ParsedItem = { name: string; grams: number; line?: number };
type UsdaFood = {
  description: string;
  foodNutrients: { nutrientId: number; unitName: string; value: number }[];
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const USDA_KEY = Deno.env.get("USDA_API_KEY") ?? "";
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
const FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-3.1-flash-lite";

export class BusyError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- HTTP helpers ----------
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(err: unknown) {
  console.error(err);
  if (err instanceof BusyError) {
    return json({ error: "busy", message: "Mate needs a sec, try again." }, 503);
  }
  return json({ error: err instanceof Error ? err.message : String(err) }, 500);
}

// ---------- Gemini: one place that talks to the model (retries + backup model) ----------
export async function askGeminiJSON(systemText: string, userText: string): Promise<unknown> {
  const attempts = [MODEL, MODEL, MODEL, FALLBACK_MODEL];

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": GEMINI_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      }
    );
    const data = await res.json().catch(() => ({}));

    if (res.ok) return JSON.parse(data.candidates[0].content.parts[0].text);

    const busy = res.status === 503 || res.status === 429;
    if (!busy) throw new Error(`Gemini error (${model}): ` + JSON.stringify(data.error ?? data));
    if (i === attempts.length - 1) throw new BusyError("Gemini is busy right now.");

    console.log(`Gemini busy (${res.status}) on ${model}, retrying...`);
    await sleep(2000 * (i + 1));
  }
  throw new BusyError("Gemini is busy right now.");
}

// ---------- Step 1: text -> food names + grams ----------
const PARSE_PROMPT =
  'Convert the user\'s ingredient list to a JSON array: ' +
  '[{"name": "USDA-style food name", "grams": number}]. ' +
  'Estimate grams for counts like "5 grapes" or "1 slice toast". ' +
  "Split combined items (toast with butter = toast + butter). " +
  "Use short, common USDA names (e.g. 'Egg, whole, raw'). " +
  "If the text contains no foods, return [].";

const PARSE_WITH_LINES_PROMPT =
  PARSE_PROMPT +
  ' The input lines are numbered. Add "line": the number of the line each item came from.';

/** withLines: input is numbered lines ("1. 2 eggs"), and each item says which line it came from */
export async function parseFoods(text: string, opts: { withLines?: boolean } = {}): Promise<ParsedItem[]> {
  const raw = await askGeminiJSON(opts.withLines ? PARSE_WITH_LINES_PROMPT : PARSE_PROMPT, text);
  if (!Array.isArray(raw)) return [];
  // Never trust AI output blindly: keep only well-formed items
  return raw.filter(
    (x): x is ParsedItem =>
      typeof x?.name === "string" &&
      typeof x?.grams === "number" &&
      x.grams > 0 &&
      (!opts.withLines || typeof x?.line === "number")
  );
}

// ---------- Step 2: USDA lookup ----------
const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

// USDA's own ranking can be off ("Grapes" -> "Grape leaves"), so score the candidates
function pickBestMatch(query: string, foods: UsdaFood[]): UsdaFood | null {
  const q = words(query);
  const qSet = new Set(q);
  let best: UsdaFood | null = null;
  let bestScore = -Infinity;
  for (const food of foods) {
    const d = words(food.description);
    const overlap = d.filter((w) => qSet.has(w)).length;
    const extra = d.length - overlap;
    const firstWordBonus = d[0] === q[0] ? 2 : 0;
    const score = overlap * 3 + firstWordBonus - extra * 0.5;
    if (score > bestScore) {
      best = food;
      bestScore = score;
    }
  }
  return best;
}

const NUTRIENT_IDS: Record<keyof Per100g, number[]> = {
  calories: [1008, 2047, 2048],
  protein: [1003],
  carbs: [1005],
  fat: [1004],
};

export async function lookupUSDA(name: string): Promise<{ match: string; per100g: Per100g } | null> {
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: name, dataType: ["Foundation", "SR Legacy"], pageSize: 10 }),
  });
  if (!res.ok) throw new Error(`USDA error ${res.status} for "${name}"`);

  const data = await res.json();
  const food = pickBestMatch(name, data.foods ?? []);
  if (!food) return null;

  const per100g: Per100g = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const key of Object.keys(NUTRIENT_IDS) as (keyof Per100g)[]) {
    for (const id of NUTRIENT_IDS[key]) {
      const n = food.foodNutrients.find(
        (n) => n.nutrientId === id && (key !== "calories" || n.unitName === "KCAL")
      );
      if (n) {
        per100g[key] = n.value;
        break;
      }
    }
  }
  return { match: food.description, per100g };
}

// ---------- Step 3: plain math ----------
export const round1 = (x: number) => Math.round(x * 10) / 10;
export const zeroMacros = (): Macros => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

export function macrosFor(grams: number, p: Per100g): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(p.calories * f),
    protein: round1(p.protein * f),
    carbs: round1(p.carbs * f),
    fat: round1(p.fat * f),
  };
}

export function addMacros(a: Macros, b: Macros, sign = 1): Macros {
  return {
    kcal: a.kcal + sign * b.kcal,
    protein: round1(a.protein + sign * b.protein),
    carbs: round1(a.carbs + sign * b.carbs),
    fat: round1(a.fat + sign * b.fat),
  };
}

export function divideMacros(m: Macros, by: number): Macros {
  return {
    kcal: Math.round(m.kcal / by),
    protein: round1(m.protein / by),
    carbs: round1(m.carbs / by),
    fat: round1(m.fat / by),
  };
}

// ---------- Safety: allergy and dislike checks in code, never left to the AI alone ----------
const ALLERGEN_WORDS: Record<string, string[]> = {
  dairy: ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "whey", "casein", "ghee", "parmesan", "mozzarella", "feta", "ricotta"],
  milk: ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "whey", "casein", "ghee"],
  lactose: ["milk", "cheese", "yogurt", "yoghurt", "cream", "whey"],
  gluten: ["wheat", "bread", "flour", "pasta", "spaghetti", "noodle", "barley", "rye", "couscous", "seitan", "cracker", "tortilla", "bulgur", "farro"],
  wheat: ["wheat", "bread", "flour", "pasta", "spaghetti", "noodle", "couscous", "seitan", "bulgur"],
  nuts: ["nut", "almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "peanut"],
  "tree nuts": ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "nut"],
  peanuts: ["peanut"],
  peanut: ["peanut"],
  shellfish: ["shrimp", "crab", "lobster", "prawn", "scallop", "clam", "mussel", "oyster", "crawfish"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia", "anchovy", "sardine", "halibut", "trout", "mackerel"],
  eggs: ["egg", "mayo", "mayonnaise", "meringue"],
  egg: ["egg", "mayo", "mayonnaise"],
  soy: ["soy", "tofu", "edamame", "tempeh", "miso"],
  sesame: ["sesame", "tahini"],
};

// Onboarding answers that mean "nothing to avoid"
const NOT_A_FOOD = new Set(["none", "no preference", "other", "n/a"]);

/** Words that mean "avoid this" for a list of allergies or dislikes */
export function avoidWords(items: string[]): string[] {
  const out = new Set<string>();
  // "Gluten/wheat" -> "gluten" + "wheat"
  const parts = items.flatMap((raw) => raw.toLowerCase().split("/")).map((s) => s.trim());
  for (const item of parts) {
    if (!item || NOT_A_FOOD.has(item)) continue;
    out.add(item);
    out.add(item.replace(/s$/, "")); // "peanuts" -> "peanut"
    for (const w of ALLERGEN_WORDS[item] ?? []) out.add(w);
  }
  return [...out].filter((w) => w.length > 2);
}

/** Which avoid-words appear in this text (substring match on purpose: over-blocking is safer) */
export function findAvoided(text: string, avoid: string[]): string[] {
  const t = text.toLowerCase();
  return avoid.filter((w) => t.includes(w));
}

// ---------- Diet rules (checked in code, like allergies) ----------
const MEAT = ["chicken", "beef", "pork", "turkey", "bacon", "ham", "sausage", "lamb", "veal", "steak", "gelatin", "pepperoni", "prosciutto", "salami"];
const SEAFOOD = ["fish", "salmon", "tuna", "cod", "shrimp", "prawn", "crab", "lobster", "anchovy", "sardine", "tilapia", "scallop", "clam", "mussel"];
const ANIMAL = ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "whey", "egg", "honey", "ghee", "mayo", "mayonnaise"];

export function dietAvoidWords(diet: string[]): string[] {
  const d = diet.map((x) => x.toLowerCase());
  const has = (name: string) => d.some((x) => x.includes(name));
  const out = new Set<string>();
  if (has("vegetarian") || has("vegan") || has("pescatarian")) MEAT.forEach((w) => out.add(w));
  if (has("vegetarian") || has("vegan")) SEAFOOD.forEach((w) => out.add(w));
  if (has("vegan")) ANIMAL.forEach((w) => out.add(w));
  if (has("halal")) ["pork", "bacon", "ham", "wine", "prosciutto", "pepperoni", "salami"].forEach((w) => out.add(w));
  if (has("kosher")) ["pork", "bacon", "ham", "shrimp", "crab", "lobster", "prosciutto", "pepperoni"].forEach((w) => out.add(w));
  return [...out];
}

/** Clean a list of strings from the app (drops blanks and non-strings) */
export const cleanList = (x: unknown) =>
  Array.isArray(x) ? x.filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim()) : [];

// ---------- Nutrition for many ingredient lines at once ----------
/**
 * One Gemini call + USDA lookups for a list of ingredient lines.
 * Returns macros per line, and which lines had something USDA couldn't find.
 */
export async function nutritionForLines(lines: string[]): Promise<{ perLine: Macros[]; uncertain: Set<number> }> {
  const perLine: Macros[] = lines.map(() => zeroMacros());
  const uncertain = new Set<number>();
  if (!lines.length) return { perLine, uncertain };

  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
  const items = await parseFoods(numbered, { withLines: true });
  const usda = await Promise.all(items.map((it) => lookupUSDA(it.name)));

  items.forEach((it, i) => {
    const idx = (it.line ?? 0) - 1;
    if (idx < 0 || idx >= lines.length) return;
    const found = usda[i];
    if (!found) {
      uncertain.add(idx);
      return;
    }
    perLine[idx] = addMacros(perLine[idx], macrosFor(it.grams, found.per100g));
  });
  return { perLine, uncertain };
}