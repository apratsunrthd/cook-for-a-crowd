import { formatGrams } from "./ingredientWeight";
import { formatQuantity } from "./quantityFormat";
import { pluralizeUnit } from "./unitFormat";
import type { Event, ParsedIngredient, Recipe, ScaledIngredient } from "./types";

/**
 * The number of people to actually cook for: RSVPs plus a buffer for the
 * people who never RSVP but show up anyway.
 */
export function effectiveHeadcount(event: Pick<Event, "rsvpCount" | "bufferMode" | "bufferValue">): number {
  const { rsvpCount, bufferMode, bufferValue } = event;
  if (bufferMode === "percentage") {
    return Math.ceil(rsvpCount * (1 + bufferValue / 100));
  }
  return Math.ceil(rsvpCount + bufferValue);
}

export class InvalidServingsError extends Error {
  constructor(recipeName: string) {
    super(`Recipe "${recipeName}" needs a valid number of servings before it can be scaled.`);
    this.name = "InvalidServingsError";
  }
}

/**
 * How many whole batches (pans) of a recipe you need to cover a headcount --
 * always rounds up, since you can't bake a fraction of a pan. Feeding 57
 * people with a recipe that serves 6 needs 10 batches (60 people covered),
 * not 9 (only 54).
 */
export function batchesNeeded(targetHeadcount: number, servingsPerBatch: number | null): number {
  if (!servingsPerBatch || servingsPerBatch <= 0) return 1;
  return Math.ceil(targetHeadcount / servingsPerBatch);
}

/** The headcount actually covered once you round up to whole batches -- may exceed the target. */
export function roundUpToWholeBatches(targetHeadcount: number, servingsPerBatch: number | null): number {
  if (!servingsPerBatch || servingsPerBatch <= 0) return targetHeadcount;
  return batchesNeeded(targetHeadcount, servingsPerBatch) * servingsPerBatch;
}

/**
 * The multiplier to apply to every ingredient quantity in a recipe so it
 * feeds `targetHeadcount` people instead of its native `servings`.
 */
export function scaleFactor(recipe: Pick<Recipe, "name" | "servings">, targetHeadcount: number): number {
  if (!recipe.servings || recipe.servings <= 0) {
    throw new InvalidServingsError(recipe.name);
  }
  return targetHeadcount / recipe.servings;
}

/**
 * Rounds a scaled quantity up when the ingredient is a genuine whole item
 * (see ingredientDivisibility.ts) -- 5.76 chicken breasts isn't usable, so
 * it rounds up to 6. A can, box, or sleeve is left exactly as scaled: you
 * use however much a recipe calls for (1 1/2 cans), even though the store
 * only sells them whole. Always rounds up, never to nearest, so a recipe
 * never ends up short by a fraction of a whole item.
 */
function roundIfWholeItem(quantity: number, roundsToWhole: boolean): number {
  return roundsToWhole ? Math.ceil(quantity) : quantity;
}

export function scaleIngredient(ingredient: ParsedIngredient, factor: number): ScaledIngredient {
  if (ingredient.quantity === null) {
    return {
      raw: ingredient.raw,
      quantity: null,
      quantity2: null,
      unit: ingredient.unit,
      description: ingredient.description,
      sizeAnnotation: ingredient.sizeAnnotation,
      needsReview: ingredient.needsReview,
      grams: null,
    };
  }
  const quantity = roundIfWholeItem(ingredient.quantity * factor, ingredient.roundsToWhole);
  const quantity2 =
    ingredient.quantity2 === null ? null : roundIfWholeItem(ingredient.quantity2 * factor, ingredient.roundsToWhole);
  // Scale the weight estimate off the actual (possibly rounded-up) quantity
  // ratio rather than the raw factor, so it reflects what you're really
  // buying -- 6 rounded-up chicken breasts, not 5.76 of them.
  const gramsFactor = ingredient.quantity !== 0 ? quantity / ingredient.quantity : factor;
  return {
    raw: ingredient.raw,
    quantity,
    quantity2,
    unit: ingredient.unit,
    description: ingredient.description,
    // A can's size doesn't change when you need more of them -- carried
    // through unchanged, same as unit/description.
    sizeAnnotation: ingredient.sizeAnnotation,
    needsReview: ingredient.needsReview,
    grams: ingredient.gramsAtRawQuantity === null ? null : ingredient.gramsAtRawQuantity * gramsFactor,
  };
}

export function scaleIngredients(ingredients: ParsedIngredient[], factor: number): ScaledIngredient[] {
  return ingredients.map((ingredient) => scaleIngredient(ingredient, factor));
}

export function scaleRecipe(recipe: Recipe, targetHeadcount: number): ScaledIngredient[] {
  const factor = scaleFactor(recipe, targetHeadcount);
  return scaleIngredients(recipe.ingredients, factor);
}

/**
 * Renders a scaled ingredient's quantity/unit/description as a plain,
 * re-parseable line, e.g. "1 1/2-2 cups flour" for a range, or "3 large
 * eggs, beaten" for lines with no leading quantity (shown as-is via `raw`
 * since there's nothing to scale). No gram suffix -- this is the form used
 * to repopulate an editable ingredients textbox, where a "(200 g)" would
 * get baked permanently into the description on the next parse. A per-unit
 * size annotation ("14.5 oz" for a can) is re-emitted in its original
 * leading position -- "10 (14.5 oz) cans ..." -- rather than appended to
 * the description, so it round-trips back through parseIngredientLine's
 * leading-annotation match on the next parse instead of drifting into an
 * ambiguous trailing position.
 */
export function formatScaledIngredientLine(ingredient: ScaledIngredient): string {
  if (ingredient.quantity === null) {
    return ingredient.raw;
  }
  const qty =
    ingredient.quantity2 === null
      ? formatQuantity(ingredient.quantity)
      : `${formatQuantity(ingredient.quantity)}-${formatQuantity(ingredient.quantity2)}`;
  const displayQuantity = ingredient.quantity2 ?? ingredient.quantity;
  const unit = pluralizeUnit(ingredient.unit, displayQuantity);
  const sizeAnnotation = ingredient.sizeAnnotation ? `(${ingredient.sizeAnnotation})` : null;
  const parts = [qty, sizeAnnotation, unit, ingredient.description].filter(
    (part): part is string => !!part && part.length > 0,
  );
  return parts.join(" ");
}

/**
 * Renders a scaled ingredient as a display line, with its gram weight
 * appended whenever it could be determined -- see ingredientWeight.ts.
 */
export function formatScaledIngredient(ingredient: ScaledIngredient): string {
  const line = formatScaledIngredientLine(ingredient);
  return ingredient.grams !== null ? `${line} (${formatGrams(ingredient.grams)})` : line;
}
