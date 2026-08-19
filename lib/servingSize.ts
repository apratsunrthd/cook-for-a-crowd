import { formatQuantity } from "./quantityFormat";
import type { ScaledIngredient } from "./types";

const GRAMS_PER_OZ = 28.3495;

/**
 * Total weight of a scaled dish, summed only across ingredient lines whose
 * weight could be determined -- see ingredientWeight.ts. An undercount for
 * a dish with mostly unweighable ingredients (a bare "3 eggs", a pinch of
 * something), same tolerance every other weight figure in this app already
 * accepts. Null when nothing in the dish could be weighed at all.
 */
export function totalDishGrams(ingredients: ScaledIngredient[]): number | null {
  const known = ingredients.filter((i) => i.grams !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, i) => sum + (i.grams as number), 0);
}

/**
 * Roughly how many ounces one person gets of this dish -- total known
 * weight divided across the headcount it's scaled for. A rough estimate
 * for gauging portion size, not a plating instruction.
 */
export function estimatePortionOz(ingredients: ScaledIngredient[], servings: number): number | null {
  if (servings <= 0) return null;
  const total = totalDishGrams(ingredients);
  if (total === null) return null;
  return total / servings / GRAMS_PER_OZ;
}

/** "4 oz" or "3 1/2 oz" -- snapped to the nearest half ounce, since eighths read as false precision for a rough per-person estimate. */
export function formatPortionOz(oz: number): string {
  return `${formatQuantity(Math.round(oz * 2) / 2)} oz`;
}
