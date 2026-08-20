import { convertUnit, parseIngredient } from "parse-ingredient";
import { guessRoundsToWhole } from "./ingredientDivisibility";
import { estimateGramsAtRawQuantity } from "./ingredientWeight";
import type { ParsedIngredient } from "./types";

// Matches a per-item size annotation sitting between the count and the
// count unit -- "10 (14.5 oz) cans green beans" -- which `parse-ingredient`
// can't handle: it treats the whole "(14.5 oz) cans ..." as an unparsed
// description and leaves quantity/unit split apart, so "cans" is never
// recognized as the unit. Stripping the parenthetical before handing the
// line to the real parser fixes that; the size itself is kept on
// `sizeAnnotation` (not baked into `description`) so it's used to compute
// this line's total weight (10 cans x 14.5 oz) and can be re-emitted in
// its original leading position every time the line is scaled and
// reformatted -- see formatScaledIngredientLine in scale.ts.
// Numbered groups, not named ones -- named capture groups need an ES2018+
// target and this project builds against ES2017. Group 1 = leading
// quantity, group 2 = the size number, group 3 = its unit.
const LEADING_SIZE_ANNOTATION =
  /^([\d¼½¾⅓⅔⅛⅜⅝⅞./\s-]+?)\s*\(\s*([\d.]+)\s*(fl\s?oz|fluid\s?ounces?|ounces?|oz|pounds?|lbs?|kilograms?|kg|grams?|g|milliliters?|ml|liters?|l)\s*\)\s*(?=\S)/i;

function extractLeadingSizeAnnotation(
  raw: string,
): { strippedRaw: string; perItemGrams: number | null; sizeText: string } | null {
  const match = raw.match(LEADING_SIZE_ANNOTATION);
  if (!match) return null;
  const [fullMatch, qty, sizeText, unit] = match;
  return {
    strippedRaw: `${qty.trim()} ${raw.slice(fullMatch.length)}`.trim(),
    perItemGrams: convertUnit(Number(sizeText), unit, "gram"),
    sizeText: `${sizeText} ${unit}`,
  };
}

/**
 * Parses a single raw ingredient line (e.g. "2 1/2 cups flour") into a
 * structured ParsedIngredient. Delegates the messy free-text parsing to
 * `parse-ingredient`, which already handles unicode fractions, mixed
 * numbers, ranges, and a unit-of-measure dictionary.
 */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const sizeAnnotation = extractLeadingSizeAnnotation(raw);
  const [parsed] = parseIngredient(sizeAnnotation?.strippedRaw ?? raw, { ignoreUOMs: SIZE_ADJECTIVES });
  if (!parsed) {
    return {
      raw,
      quantity: null,
      quantity2: null,
      unit: null,
      description: raw.trim(),
      sizeAnnotation: null,
      isGroupHeader: false,
      needsReview: true,
      gramsAtRawQuantity: null,
      roundsToWhole: false,
    };
  }
  const unit = parsed.unitOfMeasureID;
  const description = parsed.description;
  const gramsAtRawQuantity =
    sizeAnnotation?.perItemGrams !== null && sizeAnnotation?.perItemGrams !== undefined && parsed.quantity !== null
      ? sizeAnnotation.perItemGrams * parsed.quantity
      : estimateGramsAtRawQuantity({ quantity: parsed.quantity, unit, description });
  return {
    raw,
    quantity: parsed.quantity,
    quantity2: parsed.quantity2,
    // The canonical id (always singular) rather than the raw matched text,
    // so "1 cup" and "2 cups" of the same ingredient share a unit value --
    // both for consistent display pluralization and for shopping-list merging.
    unit,
    description,
    sizeAnnotation: sizeAnnotation?.sizeText ?? null,
    isGroupHeader: parsed.isGroupHeader,
    // No leading quantity found and it's not just a section heading -> flag
    // for the user to review, since scaling can't do anything useful with it.
    needsReview: parsed.quantity === null && !parsed.isGroupHeader,
    gramsAtRawQuantity,
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
