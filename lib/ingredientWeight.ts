import { convertUnit } from "parse-ingredient";
import type { ParsedIngredient } from "./types";

const ML_PER_CUP = 236.588;

// Density reference for common cooking/baking ingredients, most specific
// keywords first so e.g. "brown sugar" matches before the generic "sugar"
// entry. Deliberately not exhaustive -- ingredients not covered here (and
// not already in a weight unit) fall back to the AI estimator in
// ingredientWeightAI.ts, or are left unconverted.
const DENSITY_TABLE: Array<{ keywords: string[]; gramsPerCup: number }> = [
  { keywords: ["brown sugar"], gramsPerCup: 213 },
  { keywords: ["powdered sugar", "confectioners sugar", "confectioners' sugar", "icing sugar"], gramsPerCup: 120 },
  { keywords: ["granulated sugar", "white sugar", "sugar"], gramsPerCup: 200 },
  { keywords: ["bread flour"], gramsPerCup: 127 },
  { keywords: ["cake flour"], gramsPerCup: 114 },
  { keywords: ["whole wheat flour"], gramsPerCup: 113 },
  { keywords: ["all-purpose flour", "all purpose flour", "flour"], gramsPerCup: 120 },
  { keywords: ["butter"], gramsPerCup: 227 },
  { keywords: ["vegetable oil", "canola oil", "olive oil", "oil"], gramsPerCup: 218 },
  { keywords: ["heavy cream", "whipping cream"], gramsPerCup: 240 },
  { keywords: ["sour cream"], gramsPerCup: 240 },
  { keywords: ["cream cheese"], gramsPerCup: 232 },
  { keywords: ["yogurt"], gramsPerCup: 245 },
  { keywords: ["mayonnaise", "mayo"], gramsPerCup: 220 },
  { keywords: ["honey"], gramsPerCup: 340 },
  { keywords: ["maple syrup"], gramsPerCup: 322 },
  { keywords: ["molasses"], gramsPerCup: 328 },
  { keywords: ["milk"], gramsPerCup: 245 },
  { keywords: ["water"], gramsPerCup: 237 },
  {
    keywords: ["chicken broth", "chicken stock", "beef broth", "beef stock", "vegetable broth", "vegetable stock", "broth", "stock"],
    gramsPerCup: 240,
  },
  { keywords: ["parmesan"], gramsPerCup: 100 },
  { keywords: ["shredded cheese", "cheddar cheese", "mozzarella", "cheese"], gramsPerCup: 113 },
  { keywords: ["brown rice"], gramsPerCup: 190 },
  { keywords: ["uncooked rice", "white rice", "cooked rice", "rice"], gramsPerCup: 185 },
  { keywords: ["rolled oats", "oats"], gramsPerCup: 90 },
  { keywords: ["cocoa powder", "cocoa"], gramsPerCup: 84 },
  { keywords: ["cornstarch", "corn starch"], gramsPerCup: 128 },
  { keywords: ["panko"], gramsPerCup: 50 },
  { keywords: ["breadcrumbs", "bread crumbs"], gramsPerCup: 108 },
  { keywords: ["peanut butter"], gramsPerCup: 258 },
  { keywords: ["ketchup"], gramsPerCup: 240 },
  { keywords: ["chopped onion", "diced onion", "onion"], gramsPerCup: 160 },
  { keywords: ["chopped celery", "diced celery", "celery"], gramsPerCup: 120 },
  { keywords: ["shredded carrot", "grated carrot", "carrot"], gramsPerCup: 110 },
  { keywords: ["poppy seed"], gramsPerCup: 140 },
  { keywords: ["sesame seed"], gramsPerCup: 144 },
  { keywords: ["salt"], gramsPerCup: 288 },
];

export function densityGramsPerCup(description: string): number | null {
  const lower = description.toLowerCase();
  for (const entry of DENSITY_TABLE) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) return entry.gramsPerCup;
  }
  return null;
}

/**
 * Deterministic gram estimate for one ingredient at its raw (unscaled)
 * quantity -- exact for ingredients already given by weight (oz, lb, g, kg),
 * density-estimated for common ingredients given by volume, and null
 * (rather than a guess) for anything else -- count-based lines ("3 eggs"),
 * unrecognized ingredients, or lines with no parsed quantity/unit at all.
 */
export function estimateGramsAtRawQuantity(
  ingredient: Pick<ParsedIngredient, "quantity" | "unit" | "description">,
): number | null {
  if (ingredient.quantity === null || !ingredient.unit) return null;

  const gramsFromMass = convertUnit(ingredient.quantity, ingredient.unit, "gram");
  if (gramsFromMass !== null) return gramsFromMass;

  const ml = convertUnit(ingredient.quantity, ingredient.unit, "milliliter");
  if (ml !== null) {
    const gramsPerCup = densityGramsPerCup(ingredient.description);
    if (gramsPerCup === null) return null;
    return ml * (gramsPerCup / ML_PER_CUP);
  }

  return null;
}

/** "487 g" under 1000g, "1.2 kg" at or above -- rounded to sensible cooking precision. */
export function formatGrams(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${Math.round(grams)} g`;
}
