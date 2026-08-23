import Anthropic from "@anthropic-ai/sdk";
import { cache } from "react";
import { guessRoundsToWhole, isContainerItem } from "./ingredientDivisibility";
import { foodservicePackageCategoryFor } from "./foodservicePackaging";
import { formatQuantity } from "./quantityFormat";
import { getAnthropicApiKey } from "./settings";
import type { ShoppingListItem } from "./types";
import { pluralizeUnit } from "./unitFormat";

// Sonnet, not Haiku -- this needs real product-packaging judgment (a cup
// of butter is bought as sticks/boxes, a cup of shredded cheese as bags of
// a specific ounce size), closer to the creative-generation task in
// aiRecipe.ts than a narrow extraction/classification call.
const MODEL = "claude-sonnet-5";

export interface PurchaseSuggestion {
  buyQuantity: number;
  packageLabel: string;
}

/**
 * Items a purchase suggestion is actually useful for -- continuous amounts
 * (cups, tablespoons, teaspoons) with no already-deterministic answer.
 * Container items (a can, a sleeve) already round up to a whole unit in
 * formatShoppingListItem; a genuine whole-item count (chicken breast
 * halves, eggs) is already its own actionable "how many to buy" number;
 * bulk-bag-eligible dry staples already have a manual "Buy As" picker (see
 * foodservicePackaging.ts) -- all three would just be a second, possibly-
 * conflicting answer to a question already settled.
 */
function needsPurchaseSuggestion(item: ShoppingListItem): boolean {
  return (
    !item.needsReview &&
    item.quantity !== null &&
    !isContainerItem(item) &&
    !guessRoundsToWhole(item) &&
    foodservicePackageCategoryFor(item) === null
  );
}

const PURCHASE_TOOL: Anthropic.Tool = {
  name: "purchase_suggestions",
  description:
    "Realistic real-world purchase quantities for shopping-list ingredients given as a continuous amount (cups, tablespoons, teaspoons) that don't map to an already-known package.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "The 0-based index of the ingredient line in the input list." },
            buyQuantity: {
              type: "number",
              description:
                "How many of the package to buy, always a whole number rounded up -- you can't buy 2.3 boxes of butter.",
            },
            packageLabel: {
              type: "string",
              description:
                'Singular label for one purchased package as it would appear on a store shelf, e.g. "stick of butter", "8 oz bag of shredded cheese", "1 lb bag of rice".',
            },
          },
          required: ["index", "buyQuantity", "packageLabel"],
          additionalProperties: false,
        },
      },
    },
    required: ["suggestions"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * AI-suggested realistic purchase quantities for shopping list items that
 * are written as a continuous amount but are actually bought as a discrete
 * package in stores (butter by the stick/box, shredded cheese by the bag).
 * Deliberately narrow: only called for items `needsPurchaseSuggestion`
 * lets through -- anything with an existing deterministic or manual answer
 * is left alone. Returns an empty map if no API key is configured, the
 * call fails, or there's nothing to suggest for.
 */
export const suggestPurchaseQuantities = cache(async (
  items: ShoppingListItem[],
): Promise<Map<string, PurchaseSuggestion>> => {
  const result = new Map<string, PurchaseSuggestion>();
  const candidates = items.filter(needsPurchaseSuggestion);
  if (candidates.length === 0) return result;

  const apiKey = getAnthropicApiKey();
  if (!apiKey) return result;

  const anthropic = new Anthropic({ apiKey });

  const lines = candidates
    .map((item, index) => {
      const unit = pluralizeUnit(item.unit, item.quantity);
      const qty = item.quantity !== null ? formatQuantity(item.quantity) : "";
      const weight = item.grams !== null ? ` (~${Math.round(item.grams)}g total)` : "";
      return `${index}. ${[qty, unit, item.description].filter(Boolean).join(" ")}${weight}`;
    })
    .join("\n");

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "low" },
      tools: [PURCHASE_TOOL],
      tool_choice: { type: "tool", name: "purchase_suggestions" },
      messages: [
        {
          role: "user",
          content: `For each shopping-list ingredient below, suggest how many of a realistic store package to buy to cover the amount needed, always rounding up -- you can never buy a fraction of a package. Use real product knowledge (a stick of butter is 1/2 cup, shredded cheese commonly comes in 8oz bags, etc.). Skip a line entirely if it doesn't need a purchase suggestion at all (e.g. "salt", "water", "black pepper" -- things bought in whatever container is on hand, not worth suggesting a specific package for).\n\n${lines}`,
        },
      ],
    });
  } catch {
    return result;
  }

  if (response.stop_reason === "refusal") return result;
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) return result;

  const data = toolUse.input as {
    suggestions: Array<{ index: number; buyQuantity: number; packageLabel: string }>;
  };
  for (const entry of data.suggestions) {
    if (!Number.isFinite(entry.index)) continue;
    const item = candidates[entry.index];
    if (!item) continue;
    if (!Number.isFinite(entry.buyQuantity) || entry.buyQuantity <= 0) continue;
    if (!entry.packageLabel || entry.packageLabel.trim().length === 0) continue;
    result.set(item.key, {
      buyQuantity: Math.ceil(entry.buyQuantity),
      packageLabel: entry.packageLabel.trim(),
    });
  }
  return result;
});
