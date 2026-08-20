import { convertUnit } from "parse-ingredient";
import { densityGramsPerCup } from "./ingredientWeight";
import { formatQuantity } from "./quantityFormat";
import type { ScaledIngredient } from "./types";

const GRAMS_PER_OZ = 28.3495;
const ML_PER_CUP = 236.588;

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

/**
 * This ingredient line's volume in milliliters, if it can be determined --
 * directly from its own unit when that's already a volume measure (exact,
 * no density guess needed), or from this line's known weight and a
 * density lookup otherwise. The density fallback is what makes a
 * count-based line like "10 cans green beans" (a real weight from the
 * can-size annotation, but no volume unit at all) still contribute to a
 * volume estimate.
 */
function ingredientVolumeMl(ingredient: ScaledIngredient): number | null {
  if (ingredient.quantity !== null && ingredient.unit) {
    const direct = convertUnit(ingredient.quantity, ingredient.unit, "milliliter");
    if (direct !== null) return direct;
  }
  if (ingredient.grams !== null) {
    const gramsPerCup = densityGramsPerCup(ingredient.description);
    if (gramsPerCup !== null && gramsPerCup > 0) return (ingredient.grams / gramsPerCup) * ML_PER_CUP;
  }
  return null;
}

/**
 * Total volume of a scaled dish, summed only across ingredient lines whose
 * volume could be determined one of the two ways above. Same undercount
 * caveat as totalDishGrams -- a dish where nothing could be sized this way
 * (no volume units, no density match) returns null rather than a guess.
 */
export function totalDishVolumeMl(ingredients: ScaledIngredient[]): number | null {
  const known = ingredients.map(ingredientVolumeMl).filter((ml): ml is number => ml !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, ml) => sum + ml, 0);
}

/**
 * Roughly how many cups one person gets of this dish -- total known volume
 * divided across the headcount it's scaled for. Same rough-gauge caveat as
 * estimatePortionOz: useful for dishes better understood by volume (a
 * soup, a scoop of beans) than by weight.
 */
export function estimatePortionCups(ingredients: ScaledIngredient[], servings: number): number | null {
  if (servings <= 0) return null;
  const total = totalDishVolumeMl(ingredients);
  if (total === null) return null;
  return total / servings / ML_PER_CUP;
}

/** "1/2 cup" or "1 1/4 cups" -- snapped to the nearest common cooking fraction. Null (rather than "0 cups") when the estimate rounds down to nothing meaningful. */
export function formatPortionCups(cups: number): string | null {
  const snapped = formatQuantity(cups);
  if (snapped === "0" || snapped === "") return null;
  // Singular through a full "1 cup" ("1/2 cup", "3/4 cup", "1 cup"), plural
  // past it ("1 1/4 cups") -- eighths-rounded rather than reusing
  // formatQuantity's own thirds-aware snap, since only the >1 boundary
  // matters here and thirds never land near it.
  const roundedToEighth = Math.round(cups * 8) / 8;
  return `${snapped} cup${roundedToEighth > 1 ? "s" : ""}`;
}
