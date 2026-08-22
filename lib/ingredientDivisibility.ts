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

// A parenthetical unit note ("(15 oz) cans...") that `parse-ingredient`
// couldn't attach as a real unit ends up stuck at the front of
// `description` -- strip it before looking for a leading container word.
function leadingWord(description: string): string {
  const withoutLeadingParenthetical = description.trim().replace(/^\([^)]*\)\s*/, "");
  return withoutLeadingParenthetical.split(/\s+/)[0]?.toLowerCase() ?? "";
}

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
  return !CONTAINER_WORDS.has(leadingWord(ingredient.description));
}

/**
 * True for a line that's actually bought as a whole container -- a can,
 * jar, box, sleeve, bag, etc. -- whether that's already a recognized unit
 * (`unit === "can"`) or a bare-count line with a leading container word in
 * its description ("sleeve buttery round crackers"). Distinct from
 * `roundsToWhole`/`guessRoundsToWhole`, which answer "can a recipe use a
 * fraction of this" (yes -- half a can) -- this instead answers "can you
 * buy a fraction of this" (no), which is what a shopping list quantity
 * needs to round up to.
 */
export function isContainerItem(item: { unit: string | null; description: string }): boolean {
  if (item.unit !== null) return CONTAINER_WORDS.has(item.unit);
  return CONTAINER_WORDS.has(leadingWord(item.description));
}
