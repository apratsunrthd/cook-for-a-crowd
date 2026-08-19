import { convertUnit } from "parse-ingredient";
import { STANDARD_POT_QUARTS, type PanSize } from "./panSize";
import type { ParsedIngredient } from "./types";

// Cups of a bulk dry ingredient that realistically fill one quart of pot
// capacity for a comfortable boil/simmer -- calibrated against real
// large-batch cooking guidance (a 12-quart stockpot cooks about 12-14 cups
// of dry rice, i.e. ~1.1 cups/quart). Deliberately not exhaustive: dishes
// with no matching bulk ingredient (a baking dish, a dish with no single
// "fill" ingredient) are left to whatever vessel was already recorded.
const CUPS_PER_QUART: Array<{ keywords: string[]; cupsPerQuart: number }> = [
  { keywords: ["rice"], cupsPerQuart: 1.1 },
  { keywords: ["pasta", "noodle", "macaroni", "spaghetti", "penne", "rotini"], cupsPerQuart: 1.0 },
  {
    keywords: ["dried bean", "dry bean", "black bean", "pinto bean", "kidney bean", "navy bean", "lentil"],
    cupsPerQuart: 1.0,
  },
];

function cupsOfIngredient(ingredient: Pick<ParsedIngredient, "quantity" | "unit">): number | null {
  if (ingredient.quantity === null || !ingredient.unit) return null;
  return convertUnit(ingredient.quantity, ingredient.unit, "cup");
}

/**
 * Deterministically corrects a pot size against real fill capacity for the
 * recipe's bulk dry ingredient, when there is one. LLMs are surprisingly
 * unreliable at "pick the smallest of these 8 standard sizes that fits N
 * cups" even with explicit numeric guidance in the prompt -- verified
 * empirically generating rice recipes that came back tagged for a 20 or
 * 32-quart pot when 12 quarts was the actual smallest comfortable fit. This
 * recomputes the choice from a fixed reference table instead of trusting
 * the model's comparison, and is a no-op (returns `panSize` unchanged) for
 * anything not a pot or with no recognized bulk ingredient.
 */
export function correctPotSizeForBulkIngredient(
  ingredients: ParsedIngredient[],
  panSize: PanSize | null,
): PanSize | null {
  if (!panSize || panSize.shape !== "pot") return panSize;

  for (const ingredient of ingredients) {
    const lower = ingredient.description.toLowerCase();
    const match = CUPS_PER_QUART.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword)));
    if (!match) continue;

    const cups = cupsOfIngredient(ingredient);
    if (cups === null || cups <= 0) continue;

    const bestFit = STANDARD_POT_QUARTS.find((quarts) => quarts * match.cupsPerQuart >= cups);
    return { shape: "pot", quartsCapacity: bestFit ?? STANDARD_POT_QUARTS[STANDARD_POT_QUARTS.length - 1] };
  }

  return panSize;
}
