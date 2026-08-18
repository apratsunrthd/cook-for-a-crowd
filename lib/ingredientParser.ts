import { parseIngredient } from "parse-ingredient";
import { guessRoundsToWhole } from "./ingredientDivisibility";
import { estimateGramsAtRawQuantity } from "./ingredientWeight";
import type { ParsedIngredient } from "./types";

/**
 * Parses a single raw ingredient line (e.g. "2 1/2 cups flour") into a
 * structured ParsedIngredient. Delegates the messy free-text parsing to
 * `parse-ingredient`, which already handles unicode fractions, mixed
 * numbers, ranges, and a unit-of-measure dictionary.
 */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const [parsed] = parseIngredient(raw, { ignoreUOMs: SIZE_ADJECTIVES });
  if (!parsed) {
    return {
      raw,
      quantity: null,
      quantity2: null,
      unit: null,
      description: raw.trim(),
      isGroupHeader: false,
      needsReview: true,
      gramsAtRawQuantity: null,
      roundsToWhole: false,
    };
  }
  const unit = parsed.unitOfMeasureID;
  const description = parsed.description;
  return {
    raw,
    quantity: parsed.quantity,
    quantity2: parsed.quantity2,
    // The canonical id (always singular) rather than the raw matched text,
    // so "1 cup" and "2 cups" of the same ingredient share a unit value --
    // both for consistent display pluralization and for shopping-list merging.
    unit,
    description,
    isGroupHeader: parsed.isGroupHeader,
    // No leading quantity found and it's not just a section heading -> flag
    // for the user to review, since scaling can't do anything useful with it.
    needsReview: parsed.quantity === null && !parsed.isGroupHeader,
    gramsAtRawQuantity: estimateGramsAtRawQuantity({ quantity: parsed.quantity, unit, description }),
    roundsToWhole: guessRoundsToWhole({ unit, description }),
  };
}

export function parseIngredientLines(lines: string[]): ParsedIngredient[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseIngredientLine);
}

// `parse-ingredient`'s default unit dictionary doesn't include size
// descriptors; without ignoring them explicitly they just fall through to
// `description` anyway, but listing them keeps intent obvious.
const SIZE_ADJECTIVES = ["small", "medium", "large", "extra-large", "jumbo"];
