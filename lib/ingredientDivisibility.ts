import type { ParsedIngredient } from "./types";

// A leading word in `description` that signals "a package/container of a
// spoonable or pourable substance" -- these get used in whatever fraction a
// recipe calls for (half a can, a container and a half), even though the
// store only sells them whole. `parse-ingredient` doesn't recognize most of
// these as a unit of measure, so they end up as the first word of
// `description` with `unit: null` -- the same shape as a genuine whole-item
// count like "4 chicken breast halves". That ambiguity is why this is a
// keyword list plus an AI fallback (see ingredientWeightAI.ts) rather than
// a blanket "no unit = whole item" rule.
const CONTAINER_WORDS = new Set([
  "bag",
  "bags",
  "bottle",
  "bottles",
  "box",
  "boxes",
  "can",
  "cans",
  "carton",
  "cartons",
  "container",
  "containers",
  "jar",
  "jars",
  "loaf",
  "loaves",
  "pack",
  "packs",
  "package",
  "packages",
  "pouch",
  "pouches",
  "sack",
  "sacks",
  "sleeve",
  "sleeves",
  "tub",
  "tubs",
]);

/**
 * Best-effort deterministic guess at whether this ingredient's quantity
 * must stay a whole number when scaled. Only bare counts (no recognized
 * unit of measure) are even candidates -- anything with a real unit (cup,
 * tablespoon, can, clove, sprig, ...) is already a divisible amount, since
 * you use however much a recipe calls for regardless of how it's packaged.
 * Among bare counts, a leading container word ("sleeve", "can") means it's
 * actually a divisible substance in disguise; everything else is assumed to
 * be a genuine whole food item (a chicken breast, an egg, an onion) unless
 * ingredientWeightAI.ts's batched call corrects it.
 */
export function guessRoundsToWhole(ingredient: Pick<ParsedIngredient, "unit" | "description">): boolean {
  if (ingredient.unit !== null) return false;
  // A parenthetical unit note ("(15 oz) cans...") that `parse-ingredient`
  // couldn't attach as a real unit ends up stuck at the front of
  // `description` -- strip it before looking for the container word.
  const withoutLeadingParenthetical = ingredient.description.trim().replace(/^\([^)]*\)\s*/, "");
  const firstWord = withoutLeadingParenthetical.split(/\s+/)[0]?.toLowerCase() ?? "";
  return !CONTAINER_WORDS.has(firstWord);
}
