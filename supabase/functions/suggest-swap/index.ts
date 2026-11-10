// suggest-swap: "Make it healthier" for a recipe.
// Gemini suggests substitutions that keep the dish's core. Code then:
//   1. throws out any swap that contains an allergen, disliked food, or breaks the user's diet
//   2. calculates real before/after nutrition with USDA (never trusts the AI's numbers)
// The app calls this with: supabase.functions.invoke("suggest-swap", { body: { recipe, user } })

import {
  addMacros,
  askGeminiJSON,
  avoidWords,
  corsHeaders,
  divideMacros,
  errorResponse,
  findAvoided,
  json,
  lookupUSDA,
  type Macros,
  macrosFor,
  parseFoods,
  zeroMacros,
} from "../_shared/nutrition.ts";

type SwapRequest = {
  recipe?: { title?: string; servings?: number; ingredients?: string[] };
  user?: {
    goal?: string;
    diet?: string[];
    allergies?: string[];
    dislikes?: string[];
    remaining?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  };
};
type GeminiSwap = { original: string; replacement: string; reason: string };

const MAX_SWAPS = 3;

const MEAT = ["chicken", "beef", "pork", "turkey", "bacon", "ham", "sausage", "lamb", "veal", "steak", "gelatin", "pepperoni", "prosciutto", "salami"];
const SEAFOOD = ["fish", "salmon", "tuna", "cod", "shrimp", "prawn", "crab", "lobster", "anchovy", "sardine", "tilapia"];
const ANIMAL = ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "whey", "egg", "honey", "ghee", "mayo", "mayonnaise"];

function dietAvoidWords(diet: string[]): string[] {
  const d = diet.map((x) => x.toLowerCase());
  const out = new Set<string>();
  if (d.some((x) => x.includes("vegetarian") || x.includes("vegan") || x.includes("pescatarian"))) MEAT.forEach((w) => out.add(w));
  if (d.some((x) => x.includes("vegetarian") || x.includes("vegan"))) SEAFOOD.forEach((w) => out.add(w));
  if (d.some((x) => x.includes("vegan"))) ANIMAL.forEach((w) => out.add(w));
  return [...out];
}

const SWAP_PROMPT = `You help users of a macro-tracking app make recipes healthier for their goals.
Suggest up to ${MAX_SWAPS} ingredient substitutions.
Rules:
- Keep the dish recognizably the same: substitute, don't invent a new dish, and keep the main ingredient unless it is unsafe for the user.
- Never suggest anything containing the user's allergies or disliked foods, and respect their diet.
- Prefer swaps that move the recipe toward the user's goal and remaining macros for today (for example more protein, fewer calories, more fiber).
- Keep quantities realistic for the same number of servings.
- If the recipe already fits well, return fewer swaps or none.
- These are suggestions only: be encouraging, never shaming, and make no medical claims.
Return JSON only: {"summary": "one short encouraging sentence", "swaps": [{"original": "<copy one ingredient line exactly as given>", "replacement": "<the new ingredient line with a quantity>", "reason": "<why, max 12 words>"}]}`;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const cleanList = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string" && !!s.trim()) : []);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: SwapRequest = await req.json().catch(() => ({}));
    const ingredients = cleanList(body.recipe?.ingredients).map((s) => s.trim());
    if (!ingredients.length) return json({ error: "Send a recipe with at least one ingredient." }, 400);
    if (ingredients.length > 40 || ingredients.some((l) => l.length > 200)) {
      return json({ error: "That recipe is too long." }, 400);
    }

    const title = (body.recipe?.title ?? "Recipe").slice(0, 100);
    const servings = Math.max(1, Math.round(Number(body.recipe?.servings) || 1));
    const allergies = cleanList(body.user?.allergies);
    const dislikes = cleanList(body.user?.dislikes);
    const diet = cleanList(body.user?.diet);

    const allergyWords = avoidWords(allergies);
    const avoid = [...new Set([...allergyWords, ...avoidWords(dislikes), ...dietAvoidWords(diet)])];

    // Heads-up if the ORIGINAL recipe already contains one of the user's allergens
    const allergenWarnings = ingredients
      .map((line) => ({ line, hits: findAvoided(line, allergyWords) }))
      .filter((x) => x.hits.length)
      .map((x) => `${x.line} (may contain ${x.hits[0]})`);

    // ---- 1. Ask Gemini for swaps ----
    const raw = (await askGeminiJSON(
      SWAP_PROMPT,
      JSON.stringify({
        recipe: { title, servings, ingredients },
        user: {
          goal: body.user?.goal ?? "eat healthier",
          diet,
          allergies,
          dislikes,
          remainingToday: body.user?.remaining ?? null,
        },
      })
    )) as { summary?: unknown; swaps?: unknown };

    // ---- 2. Validate + safety-filter in code ----
    const lineIndex = new Map(ingredients.map((l, i) => [norm(l), i]));
    const used = new Set<number>();
    let blocked = 0;
    const swaps: (GeminiSwap & { index: number })[] = [];

    for (const s of Array.isArray(raw?.swaps) ? raw.swaps : []) {
      if (typeof s?.original !== "string" || typeof s?.replacement !== "string") continue;
      const index = lineIndex.get(norm(s.original));
      const replacement = s.replacement.trim();
      if (index === undefined || used.has(index)) continue; // must refer to a real line, once
      if (!replacement || replacement.length > 200 || norm(replacement) === norm(s.original)) continue;
      if (findAvoided(replacement, avoid).length) {
        blocked++;
        continue;
      }
      used.add(index);
      swaps.push({
        original: ingredients[index],
        replacement,
        reason: typeof s.reason === "string" ? s.reason.slice(0, 120) : "",
        index,
      });
      if (swaps.length === MAX_SWAPS) break;
    }

    // ---- 3. Real nutrition: parse original lines + replacement lines in ONE call ----
    const allLines = [...ingredients, ...swaps.map((s) => s.replacement)];
    const numbered = allLines.map((l, i) => `${i + 1}. ${l}`).join("\n");
    const items = await parseFoods(numbered, { withLines: true });
    const usda = await Promise.all(items.map((it) => lookupUSDA(it.name)));

    const perLine: Macros[] = allLines.map(() => zeroMacros());
    const uncertain = new Set<number>(); // lines with an item USDA couldn't find
    items.forEach((it, i) => {
      const lineIdx = (it.line ?? 0) - 1;
      if (lineIdx < 0 || lineIdx >= allLines.length) return;
      const found = usda[i];
      if (!found) {
        uncertain.add(lineIdx);
        return;
      }
      perLine[lineIdx] = addMacros(perLine[lineIdx], macrosFor(it.grams, found.per100g));
    });

    const beforeTotal = ingredients.reduce((t, _, i) => addMacros(t, perLine[i]), zeroMacros());
    const result = swaps.map((s, j) => {
      const replIdx = ingredients.length + j;
      const deltaTotal = addMacros(perLine[replIdx], perLine[s.index], -1);
      return {
        original: s.original,
        replacement: s.replacement,
        reason: s.reason,
        delta: divideMacros(deltaTotal, servings), // per serving
        uncertain: uncertain.has(replIdx) || uncertain.has(s.index),
      };
    });

    const before = divideMacros(beforeTotal, servings);
    const after = result.reduce((m, s) => addMacros(m, s.delta), before);

    return json({
      summary: typeof raw?.summary === "string" ? raw.summary.slice(0, 200) : "",
      servings,
      before,
      after, // if every swap is accepted
      swaps: result,
      blocked, // swaps removed by the safety check
      allergenWarnings,
    });
  } catch (err) {
    return errorResponse(err);
  }
});
