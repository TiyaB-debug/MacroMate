import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { MealType } from '@/theme';

// App data: recipes, pantry, and today's food log.
// Kept in memory with sample data for now. Each list maps to a Supabase table
// (recipes + recipe_ingredients, pantry_items, daily_logs) once the backend is connected.

export type Macros = { calories: number; protein: number; carbs: number; fat: number };

export type Recipe = {
  id: string;
  title: string;
  minutes: number;
  cuisine: string;
  servings: number;
  mealTypes: MealType[];
  tags: string[];
  ingredients: string[]; // one per line, e.g. "2 salmon fillets"
  steps: string;
  macros: Macros; // per serving
  favorite: boolean;
  draft?: boolean;
};

export type PantryCategory = 'Proteins' | 'Vegetables' | 'Fruits' | 'Dairy' | 'Grains' | 'Other';
export const PANTRY_CATEGORIES: PantryCategory[] = ['Proteins', 'Vegetables', 'Fruits', 'Dairy', 'Grains', 'Other'];

export type PantryItem = { id: string; name: string; category: PantryCategory; expires?: string /* YYYY-MM-DD */ };

export type LogEntry = Macros & { id: string; meal: MealType; name: string; recipeId?: string };

// ---------- helpers ----------

let counter = 0;
export const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(date?: string) {
  if (!date) return undefined;
  const ms = new Date(date + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86400000);
}

export function formatExpiry(date?: string) {
  if (!date) return 'No expiry date';
  const d = daysUntil(date)!;
  if (d < 0) return 'Expired';
  if (d === 0) return 'Expires today';
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  return `Expires: ${label}`;
}

const FILLER = new Set(['organic', 'fresh', 'whole', 'grass-fed', 'free-range', 'large', 'small', 'raw', 'frozen', 'greek', 'cheddar', 'brown', 'yellow', 'red', 'green']);
const singular = (w: string) => w.replace(/(ies)$/, 'y').replace(/(oes|ches|shes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');

/** Key words of a food name: "Grass-fed Beef" -> ["beef"], "Salmon Fillets" -> ["salmon", "fillet"]. */
export function keyWords(name: string) {
  const words = name.toLowerCase().split(/[^a-z-]+/).filter((w) => w.length > 2 && !FILLER.has(w)).map(singular);
  return words.length ? words : [singular(name.toLowerCase().trim())];
}

/** Does a recipe ingredient line use this pantry item? */
export function usesItem(ingredientLine: string, itemName: string) {
  const line = ingredientLine.toLowerCase().split(/[^a-z-]+/).map(singular);
  return keyWords(itemName).some((k) => line.includes(k));
}

export function matchRecipe(recipe: Recipe, pantry: PantryItem[]) {
  const have = recipe.ingredients.filter((ing) => pantry.some((p) => usesItem(ing, p.name)));
  const missing = recipe.ingredients.filter((ing) => !have.includes(ing));
  return { have, missing, score: recipe.ingredients.length ? have.length / recipe.ingredients.length : 0 };
}

// ---------- sample data (matches the Figma screens) ----------

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'r1',
    title: 'Avocado Toast',
    minutes: 15,
    cuisine: 'American',
    servings: 1,
    mealTypes: ['breakfast'],
    tags: ['Healthy', 'Easy', 'Vegetarian'],
    ingredients: ['2 slices whole wheat bread', '1 ripe avocado', '1 egg', 'Pinch of salt and pepper', 'Chili flakes'],
    steps: 'Toast the bread. Mash the avocado with salt and pepper and spread it on the toast. Top with a fried egg and chili flakes.',
    macros: { calories: 380, protein: 14, carbs: 32, fat: 22 },
    favorite: false,
  },
  {
    id: 'r2',
    title: 'Creamy Mushroom Risotto',
    minutes: 45,
    cuisine: 'Italian',
    servings: 4,
    mealTypes: ['dinner'],
    tags: ['Comfort', 'Vegetarian'],
    ingredients: ['1.5 cups arborio rice', '8 oz mushrooms', '1 yellow onion', '4 cups vegetable broth', '1/2 cup parmesan', '2 tbsp butter'],
    steps: 'Soften the onion in butter, add the mushrooms, then the rice. Add warm broth a ladle at a time, stirring, until creamy. Finish with parmesan.',
    macros: { calories: 520, protein: 14, carbs: 72, fat: 18 },
    favorite: true,
  },
  {
    id: 'r3',
    title: 'Strawberry Spinach Salad',
    minutes: 20,
    cuisine: 'American',
    servings: 2,
    mealTypes: ['lunch'],
    tags: ['Fresh', 'Gluten-free', 'Vegetarian'],
    ingredients: ['4 cups spinach', '1 cup strawberries', '1/4 cup feta', '1/4 cup walnuts', '2 tbsp balsamic vinaigrette'],
    steps: 'Slice the strawberries, toss everything with the vinaigrette, and serve.',
    macros: { calories: 290, protein: 8, carbs: 22, fat: 19 },
    favorite: false,
  },
  {
    id: 'r4',
    title: 'Salmon & Brown Rice Bowl',
    minutes: 30,
    cuisine: 'Asian',
    servings: 2,
    mealTypes: ['lunch', 'dinner'],
    tags: ['High Protein'],
    ingredients: ['2 salmon fillets', '1 cup brown rice', '1 head broccoli', '2 carrots', '2 tbsp soy sauce'],
    steps: 'Cook the rice. Roast the salmon, broccoli and sliced carrots at 400°F for 15 minutes. Serve over rice with soy sauce.',
    macros: { calories: 560, protein: 38, carbs: 55, fat: 18 },
    favorite: false,
  },
  {
    id: 'r5',
    title: 'Greek Yogurt Parfait',
    minutes: 5,
    cuisine: 'Mediterranean',
    servings: 1,
    mealTypes: ['breakfast', 'snacks'],
    tags: ['High Protein', 'Vegetarian', 'Ready in 30'],
    ingredients: ['1 cup greek yogurt', '1 banana', '1/4 cup granola', '1 tsp honey'],
    steps: 'Layer the yogurt, sliced banana and granola. Drizzle with honey.',
    macros: { calories: 310, protein: 20, carbs: 45, fat: 6 },
    favorite: true,
  },
  {
    id: 'r6',
    title: 'Spaghetti Bolognese',
    minutes: 40,
    cuisine: 'Italian',
    servings: 4,
    mealTypes: ['dinner'],
    tags: ['Comfort', 'High Protein'],
    ingredients: ['1 lb beef', '12 oz spaghetti', '1 yellow onion', '2 carrots', '24 oz tomato sauce'],
    steps: 'Brown the beef with diced onion and carrot. Add the sauce and simmer 20 minutes. Serve over cooked spaghetti.',
    macros: { calories: 640, protein: 34, carbs: 70, fat: 22 },
    favorite: false,
  },
];

const SAMPLE_PANTRY: PantryItem[] = [
  { id: 'p1', name: 'Salmon Fillets', category: 'Proteins', expires: daysFromNow(2) },
  { id: 'p2', name: 'Organic Eggs', category: 'Proteins', expires: daysFromNow(14) },
  { id: 'p3', name: 'Grass-fed Beef', category: 'Proteins', expires: daysFromNow(5) },
  { id: 'p4', name: 'Carrots', category: 'Vegetables', expires: daysFromNow(10) },
  { id: 'p5', name: 'Broccoli', category: 'Vegetables', expires: daysFromNow(4) },
  { id: 'p6', name: 'Yellow Onions', category: 'Vegetables', expires: daysFromNow(30) },
  { id: 'p7', name: 'Apples', category: 'Fruits', expires: daysFromNow(12) },
  { id: 'p8', name: 'Bananas', category: 'Fruits', expires: daysFromNow(3) },
  { id: 'p9', name: 'Oranges', category: 'Fruits', expires: daysFromNow(20) },
  { id: 'p10', name: 'Whole Milk', category: 'Dairy', expires: daysFromNow(6) },
  { id: 'p11', name: 'Cheddar Cheese', category: 'Dairy', expires: daysFromNow(40) },
  { id: 'p12', name: 'Greek Yogurt', category: 'Dairy', expires: daysFromNow(9) },
  { id: 'p13', name: 'Whole Wheat Bread', category: 'Grains', expires: daysFromNow(5) },
  { id: 'p14', name: 'Brown Rice', category: 'Grains', expires: daysFromNow(90) },
  { id: 'p15', name: 'Spaghetti', category: 'Grains', expires: daysFromNow(120) },
];

// ---------- context ----------

type DataContextValue = {
  recipes: Recipe[];
  pantry: PantryItem[];
  log: LogEntry[];
  saveRecipe: (r: Recipe) => void;
  toggleFavorite: (id: string) => void;
  addPantryItem: (item: Omit<PantryItem, 'id'>) => void;
  removePantryItem: (id: string) => void;
  addLogEntries: (entries: Omit<LogEntry, 'id'>[]) => void;
  removeLogEntry: (id: string) => void;
  resetAll: () => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>(SAMPLE_RECIPES);
  const [pantry, setPantry] = useState<PantryItem[]>(SAMPLE_PANTRY);
  const [log, setLog] = useState<LogEntry[]>([]);

  const value = useMemo<DataContextValue>(
    () => ({
      recipes,
      pantry,
      log,
      saveRecipe: (r) =>
        setRecipes((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [r, ...list])),
      toggleFavorite: (id) => setRecipes((list) => list.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))),
      addPantryItem: (item) => setPantry((list) => [...list, { ...item, id: newId() }]),
      removePantryItem: (id) => setPantry((list) => list.filter((p) => p.id !== id)),
      addLogEntries: (entries) => setLog((list) => [...list, ...entries.map((e) => ({ ...e, id: newId() }))]),
      removeLogEntry: (id) => setLog((list) => list.filter((e) => e.id !== id)),
      resetAll: () => {
        setRecipes(SAMPLE_RECIPES);
        setPantry(SAMPLE_PANTRY);
        setLog([]);
      },
    }),
    [recipes, pantry, log],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
