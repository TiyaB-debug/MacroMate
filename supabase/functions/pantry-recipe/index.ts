// pantry-recipe: "Create from Pantry".
// Gemini invents up to 2 new recipes that mostly use what's in the user's pantry and match their craving.
// Code then:
//   1. drops any recipe that contains an allergen, disliked/avoided food, or breaks the user's diet
//   2. calculates real nutrition per serving with USDA (never trusts the AI's numbers)
// The app calls this with: supabase.functions.invoke("pantry-recipe", { body: { pantry, craving, user } })

import {
  addMacros,
  askGeminiJSON,
  avoidWords,
  cleanList,
  corsHeaders,
  dietAvoidWords,
  divideMacros,
  errorResponse,
  findAvoided,
  json,
  nutritionForLines,
  zeroMacros,
} from "../_shared/nutrition.ts";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const MAX_RECIPES = 2;

type Body = {
  pantry?: unknown;
  craving?: { cuisine?: unknown; include?: unknown; avoid?: unknown; other?: unknown };
  user?: {
    goal?: unknown;
    diet?: unknown;
    allergies?: unknown;
    dislikes?: unknown;
    remaining?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  };
};

type RawRecipe = {
  title?: unknown;
  cuisine?: unknown;
  minutes?: unknown;
  servings?: unknown;
  mealTypes?: unknown;
  tags?: unknown;
  ingredients?: unknown;
  steps?: unknown;
};

const PROMPT = `You are Mate, the cooking buddy in a macro-tracking app.
Create up to ${MAX_RECIPES} different, realistic home recipes for the user.
Rules:
- Build each recipe mostly from the user's pantry. Basic staples (salt, pepper, oil, water, common spices) are always OK. Add at most 3 ingredients they don't have.
- Match the craving: cuisine, ingredients to include, and other preferences (for example quick, high protein, comfort).
- Never use the user's allergies, disliked foods, or foods they want to avoid, and respect their diet.
- Lean toward the user's goal and what they have left today, without being extreme.
- Every ingredient line needs a quantity, e.g. "2 salmon fillets", "1 cup brown rice", "1 tbsp olive oil".
- Steps: short and numbered, one per line.
- Encouraging tone, no medical claims.
Return JSON only:
{"recipes": [{"title": string, "cuisine": string, "minutes": number, "servings": number,
"mealTypes": ["breakfast" | "lunch" | "dinner" | "snacks"], "tags": [string, max 3],
"ingredients": [string], "steps": string}]}`;

const str = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
};

/** Turn whatever Gemini returned into a well-formed recipe, or null */
function cleanRecipe(r: RawRecipe) {
  const title = str(r?.title, 80);
  const ingredients = cleanList(r?.ingredients).map((l) => l.slice(0, 150)).slice(0, 25);
  const steps = str(r?.steps, 2000);
  if (!title || ingredients.length < 2 || !steps) return null;

  const mealTypes = cleanList(r?.mealTypes).map((m) => m.toLowerCase()).filter((m) => MEAL_TYPES.includes(m));
  return {
    title,
    cuisine: str(r?.cuisine, 40) || "Homemade",
    minutes: clamp(r?.minutes, 5, 240, 30),
    servings: clamp(r?.servings, 1, 12, 2),
    mealTypes: mealTypes.length ? [...new Set(mealTypes)] : ["dinner"],
    tags: cleanList(r?.tags).map((t) => t.slice(0, 24)).slice(0, 3),
    ingredients,
    steps,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: Body = await req.json().catch(() => ({}));
    const pantry = cleanList(body.pantry).slice(0, 100);
    if (!pantry.length) return json({ error: "Add some items to your pantry first." }, 400);

    const craving = {
      cuisine: str(body.craving?.cuisine, 100),
      include: str(body.craving?.include, 200),
      avoid: str(body.craving?.avoid, 200),
      other: str(body.craving?.other, 200),
    };
    const allergies = cleanList(body.user?.allergies);
    const dislikes = cleanList(body.user?.dislikes);
    const diet = cleanList(body.user?.diet);
    const typedAvoid = craving.avoid.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);

    // Everything the recipe must not contain, checked in code after Gemini answers
    const avoid = [
      ...new Set([...avoidWords(allergies), ...avoidWords(dislikes), ...avoidWords(typedAvoid), ...dietAvoidWords(diet)]),
    ];

    // ---- 1. Ask Gemini for recipes ----
    const raw = (await askGeminiJSON(
      PROMPT,
      JSON.stringify({
        pantry,
        craving,
        user: {
          goal: str(body.user?.goal, 100) || "eat healthier",
          diet,
          allergies,
          dislikes,
          remainingToday: body.user?.remaining ?? null,
        },
      })
    )) as { recipes?: unknown };

    // ---- 2. Validate + safety-filter in code ----
    let blocked = 0;
    const recipes = [];
    for (const r of Array.isArray(raw?.recipes) ? raw.recipes : []) {
      const clean = cleanRecipe(r as RawRecipe);
      if (!clean) continue;
      const text = `${clean.title}\n${clean.ingredients.join("\n")}`;
      if (findAvoided(text, avoid).length) {
        blocked++;
        continue;
      }
      recipes.push(clean);
      if (recipes.length === MAX_RECIPES) break;
    }

    if (!recipes.length) {
      return json({ recipes: [], blocked });
    }

    // ---- 3. Real nutrition for every ingredient line of every recipe, in ONE call ----
    const allLines = recipes.flatMap((r) => r.ingredients);
    const { perLine, uncertain } = await nutritionForLines(allLines);

    let offset = 0;
    const result = recipes.map((r) => {
      const idxs = r.ingredients.map((_, i) => offset + i);
      offset += r.ingredients.length;
      const total = idxs.reduce((t, i) => addMacros(t, perLine[i]), zeroMacros());
      const per = divideMacros(total, r.servings);
      return {
        ...r,
        macros: { calories: per.kcal, protein: Math.round(per.protein), carbs: Math.round(per.carbs), fat: Math.round(per.fat) },
        uncertain: idxs.some((i) => uncertain.has(i)),
      };
    });

    return json({ recipes: result, blocked });
  } catch (err) {
    return errorResponse(err);
  }
});