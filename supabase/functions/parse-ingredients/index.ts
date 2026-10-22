// parse-ingredients: messy ingredient text -> foods + grams (Gemini) -> real nutrients (USDA) -> macros
// The app calls this with: supabase.functions.invoke("parse-ingredients", { body: { text } })

type Per100g = { calories: number; protein: number; carbs: number; fat: number };
type ParsedItem = { name: string; grams: number };
type UsdaFood = {
  description: string;
  foodNutrients: { nutrientId: number; unitName: string; value: number }[];
};

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const USDA_KEY = Deno.env.get("USDA_API_KEY") ?? "";
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
const FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-3.1-flash-lite";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class BusyError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Step 1: Gemini turns text into food names + grams (no math) ----------
function callGemini(model: string, text: string) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                'Convert the user\'s ingredient list to a JSON array: ' +
                '[{"name": "USDA-style food name", "grams": number}]. ' +
                'Estimate grams for counts like "5 grapes" or "1 slice toast". ' +
                "Split combined items (toast with butter = toast + butter). " +
                "Use short, common USDA names (e.g. 'Egg, whole, raw'). " +
                "If the text contains no foods, return [].",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    }
  );
}

async function parseWithGemini(text: string): Promise<ParsedItem[]> {
  // Try the main model 3 times, then the backup once
  const attempts = [MODEL, MODEL, MODEL, FALLBACK_MODEL];

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i];
    const res = await callGemini(model, text);
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const raw = JSON.parse(data.candidates[0].content.parts[0].text);
      // Never trust AI output blindly: keep only well-formed items
      if (!Array.isArray(raw)) return [];
      return raw.filter(
        (x): x is ParsedItem =>
          typeof x?.name === "string" && typeof x?.grams === "number" && x.grams > 0
      );
    }

    const busy = res.status === 503 || res.status === 429;
    if (!busy) throw new Error(`Gemini error (${model}): ` + JSON.stringify(data.error ?? data));
    if (i === attempts.length - 1) throw new BusyError("Gemini is busy right now.");

    console.log(`Gemini busy (${res.status}) on ${model}, retrying...`);
    await sleep(2000 * (i + 1));
  }
  return [];
}

// ---------- Step 2: USDA gives real nutrients per 100 g ----------
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

// Calories has backups because some foods store energy under a different ID
const NUTRIENT_IDS: Record<keyof Per100g, number[]> = {
  calories: [1008, 2047, 2048],
  protein: [1003],
  carbs: [1005],
  fat: [1004],
};

async function lookupUSDA(name: string): Promise<{ match: string; per100g: Per100g } | null> {
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
const round1 = (x: number) => Math.round(x * 10) / 10;

function macrosFor(grams: number, p: Per100g) {
  const f = grams / 100;
  return {
    kcal: Math.round(p.calories * f),
    protein: round1(p.protein * f),
    carbs: round1(p.carbs * f),
    fat: round1(p.fat * f),
  };
}

// ---------- The endpoint the app calls ----------
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json().catch(() => ({}));
    if (typeof text !== "string" || !text.trim()) {
      return json({ error: 'Send { "text": "..." } with some ingredients.' }, 400);
    }
    if (text.length > 1000) return json({ error: "That list is too long." }, 400);

    const items = await parseWithGemini(text);
    const usda = await Promise.all(items.map((item) => lookupUSDA(item.name)));

    // per100g is included so the app can recalculate when the user edits grams
    const results = items.map((item, i) => {
      const found = usda[i];
      if (!found) return { name: item.name, grams: item.grams, found: false };
      return {
        name: item.name,
        grams: item.grams,
        found: true,
        usdaMatch: found.match,
        per100g: found.per100g,
        ...macrosFor(item.grams, found.per100g),
      };
    });

    return json({ items: results });
  } catch (err) {
    console.error(err);
    if (err instanceof BusyError) {
      return json({ error: "busy", message: "Mate needs a sec, try again." }, 503);
    }
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});