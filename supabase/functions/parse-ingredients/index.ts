// parse-ingredients: messy ingredient text -> foods + grams (Gemini) -> real nutrients (USDA) -> macros
// The app calls this with: supabase.functions.invoke("parse-ingredients", { body: { text } })

import { corsHeaders, errorResponse, json, lookupUSDA, macrosFor, parseFoods } from "../_shared/nutrition.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text } = await req.json().catch(() => ({}));
    if (typeof text !== "string" || !text.trim()) {
      return json({ error: 'Send { "text": "..." } with some ingredients.' }, 400);
    }
    if (text.length > 1000) return json({ error: "That list is too long." }, 400);

    const items = await parseFoods(text);
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
    return errorResponse(err);
  }
});
