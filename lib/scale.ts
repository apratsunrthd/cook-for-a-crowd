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

export function scaleIngredient(ingredient: ParsedIngredient, factor: number): ScaledIngredient {
  return {
    raw: ingredient.raw,
    quantity: ingredient.quantity === null ? null : ingredient.quantity * factor,
    quantity2: ingredient.quantity2 === null ? null : ingredient.quantity2 * factor,
    unit: ingredient.unit,
    description: ingredient.description,
    needsReview: ingredient.needsReview,
    grams: ingredient.gramsAtRawQuantity === null ? null : ingredient.gramsAtRawQuantity * factor,
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
 * Renders a scaled ingredient as a display line, e.g. "1 1/2 - 2 cups flour
 * (200 g)" for a range, or "3 large eggs, beaten" for lines with no leading
 * quantity (shown as-is via `raw` since there's nothing to scale). The gram
 * weight is appended whenever it could be determined -- see
 * ingredientWeight.ts.
 */
export function formatScaledIngredient(ingredient: ScaledIngredient): string {
  if (ingredient.quantity === null) {
    return ingredient.raw;
  }
  const qty =
    ingredient.quantity2 === null
      ? formatQuantity(ingredient.quantity)
      : `${formatQuantity(ingredient.quantity)}-${formatQuantity(ingredient.quantity2)}`;
  const displayQuantity = ingredient.quantity2 ?? ingredient.quantity;
  const unit = pluralizeUnit(ingredient.unit, displayQuantity);
  const parts = [qty, unit, ingredient.description].filter(
    (part): part is string => !!part && part.length > 0,
  );
  const line = parts.join(" ");
  return ingredient.grams !== null ? `${line} (${formatGrams(ingredient.grams)})` : line;
}
