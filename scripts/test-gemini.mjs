// Full pipeline test: messy text -> Gemini (food names + grams) -> USDA (nutrients) -> macros
// Run (PowerShell):
//   $env:GEMINI_API_KEY="your-gemini-key"; $env:USDA_API_KEY="your-usda-key"; node scripts/test-gemini.mjs
// Try your own foods:
//   node scripts/test-gemini.mjs "1 cup rice, chicken breast, handful of almonds"

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const USDA_KEY = process.env.USDA_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const input = process.argv[2] || "2 eggs, 5 grapes, 1 slice toast with butter";

if (!GEMINI_KEY || !USDA_KEY) {
  console.error("Missing a key. Set both GEMINI_API_KEY and USDA_API_KEY (see top of file).");
  process.exit(1);
}

// ---------- Step 1: Gemini turns text into food names + grams (no math) ----------
// Backup model if the main one stays busy. Copy the exact name from AI Studio's model dropdown.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// USDA's own ranking can be off ("Grapes" -> "Grape leaves"), so score the candidates:
// reward matching words and the same first word, penalize extra words.
const words = (s) => s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);

function pickBestMatch(query, foods) {
  const q = words(query);
  const qSet = new Set(q);
  let best = null;
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

async function parseWithGemini(text) {
  // Try the main model 3 times, then the backup once
  const attempts = [MODEL, MODEL, MODEL, FALLBACK_MODEL];

  for (let i = 0; i < attempts.length; i++) {
    const model = attempts[i];
    const res = await callGemini(model, text);
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      if (i > 0) console.log(`(worked on attempt ${i + 1} using ${model})\n`);
      return JSON.parse(data.candidates[0].content.parts[0].text);
    }

    const busy = res.status === 503 || res.status === 429;
    if (!busy || i === attempts.length - 1) {
      throw new Error(`Gemini error (${model}): ` + JSON.stringify(data.error ?? data));
    }

    const wait = 2000 * (i + 1);
    console.log(`Gemini busy (${res.status}), retrying in ${wait / 1000}s...`);
    await sleep(wait);
  }
}

function callGemini(model, text) {
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
                "Use short, common USDA names (e.g. 'Egg, whole, raw').",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
}
// ---------- Step 2: USDA gives real nutrients per 100 g ----------
// USDA nutrient IDs. Calories has backups because some foods store energy under a different ID.
const NUTRIENT_IDS = {
  calories: [1008, 2047, 2048],
  protein: [1003],
  carbs: [1005],
  fat: [1004],
};

async function lookupUSDA(name) {
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: name,
      dataType: ["Foundation", "SR Legacy"], // generic foods, values are per 100 g
        pageSize: 10, // get several candidates, then pick the best one ourselves
    }),
  });

  if (!res.ok) throw new Error(`USDA error ${res.status} for "${name}"`);
  const data = await res.json();
    const food = pickBestMatch(name, data.foods ?? []);
  if (!food) return null; // no match: the app would ask the user to enter it manually

  const per100g = {};
  for (const [key, ids] of Object.entries(NUTRIENT_IDS)) {
    per100g[key] = 0;
    for (const id of ids) {
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

// ---------- Step 3: plain math (never trust the AI with numbers) ----------
const round1 = (x) => Math.round(x * 10) / 10;
const short = (s, len = 32) => (s.length > len ? s.slice(0, len - 1) + "…" : s);

function macrosFor(grams, per100g) {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.calories * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
  };
}

// ---------- Run it ----------
try {
  console.log("Input:", input, "\n");

  const items = await parseWithGemini(input);
  const usda = await Promise.all(items.map((item) => lookupUSDA(item.name)));

  const rows = [];
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  items.forEach((item, i) => {
    const found = usda[i];
    if (!found) {
      rows.push({ food: short(item.name), grams: item.grams, "USDA match": "NOT FOUND - enter manually" });
      return;
    }
    const m = macrosFor(item.grams, found.per100g);
    for (const k of Object.keys(total)) total[k] += m[k];
    rows.push({ food: short(item.name), grams: item.grams, "USDA match": short(found.match), ...m });
  });

  rows.push({
    food: "TOTAL (estimate)",
    grams: "",
    "USDA match": "",
    kcal: Math.round(total.kcal),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat),
  });

  console.table(rows);
} catch (err) {
  console.error(err.message);
    process.exitCode = 1; // (process.exit() causes that "Assertion failed" crash on Windows)
}