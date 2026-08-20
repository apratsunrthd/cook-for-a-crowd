import Anthropic from "@anthropic-ai/sdk";
import type { ParsedIngredient } from "./types";

// Haiku, not Sonnet/Opus -- batched estimation over a short ingredient
// list, not a task that needs a bigger model.
const MODEL = "claude-haiku-4-5";

export interface IngredientEstimate {
  grams: number | null;
  /** True = a genuine whole item (round when scaled). False = divisible (a can, a cup). Null = no opinion / doesn't apply. */
  wholeItem: boolean | null;
}

const ESTIMATES_TOOL: Anthropic.Tool = {
  name: "ingredient_estimates",
  description: "Estimated weight and whole-item classification for each ingredient line, at the quantity as written.",
  input_schema: {
    type: "object",
    properties: {
      estimates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "The 0-based index of the ingredient line in the input list." },
            grams: {
              type: ["number", "null"],
              description:
                "Best estimate of the total weight in grams for this ingredient at the quantity as written, or null if there's no meaningful weight to estimate (e.g. \"salt to taste\").",
            },
            wholeItem: {
              type: ["boolean", "null"],
              description:
                'True if this line names a genuine whole, indivisible food item that must stay a whole number when scaled (a chicken breast, an egg, an onion). False if it\'s a divisible amount -- including a can, box, bag, package, container, jar, bottle, or sleeve of something, since a recipe can call for however much it needs (e.g. "1 1/2 cans") even though the store only sells them whole. Null if this line already has a normal unit of measure (cups, tablespoons, etc.) and the question doesn\'t apply.',
            },
          },
          required: ["index", "grams", "wholeItem"],
          additionalProperties: false,
        },
      },
    },
    required: ["estimates"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * Best-effort batched estimate, for ingredient lines the deterministic
 * passes in ingredientWeight.ts and ingredientDivisibility.ts couldn't
 * confidently resolve, of (a) weight in grams and (b) whether the line's
 * quantity is a genuine whole item vs. a divisible amount -- count-based
 * lines like "3 large eggs" or "1 sleeve crackers" where a typical per-item
 * weight and whether it's a whole/indivisible thing are common cooking
 * knowledge, not something a unit-conversion table or keyword list can
 * fully cover. One call covers the whole gap list; lines the model can't
 * reasonably say anything about (e.g. "salt to taste") are simply omitted
 * from its response, never guessed.
 */
export async function estimateIngredientDetailsWithAI(lines: string[]): Promise<Map<number, IngredientEstimate>> {
  const result = new Map<number, IngredientEstimate>();
  if (!process.env.ANTHROPIC_API_KEY || lines.length === 0) return result;

  try {
    const client = new Anthropic();
    const numbered = lines.map((line, i) => `${i}. ${line}`).join("\n");
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [ESTIMATES_TOOL],
      tool_choice: { type: "tool", name: "ingredient_estimates" },
      messages: [
        {
          role: "user",
          content: `For each ingredient line below: (1) estimate its weight in grams at the quantity as written (do not scale it), using typical cooking/ingredient knowledge including standard per-item weights (e.g. one large egg, one clove of garlic); (2) classify whether it names a genuine whole/indivisible item versus a divisible amount (a can, box, bag, package, container, jar, bottle, or sleeve of something is divisible -- you can use half of one). Leave a line out entirely if there's nothing meaningful to say about it (e.g. "salt to taste", "for garnish").\n\n${numbered}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return result;
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return result;

    const data = toolUse.input as {
      estimates: Array<{ index: number; grams: number | null; wholeItem: boolean | null }>;
    };
    for (const entry of data.estimates) {
      if (!Number.isFinite(entry.index)) continue;
      const grams = typeof entry.grams === "number" && Number.isFinite(entry.grams) && entry.grams > 0 ? entry.grams : null;
      const wholeItem = typeof entry.wholeItem === "boolean" ? entry.wholeItem : null;
      if (grams === null && wholeItem === null) continue;
      result.set(entry.index, { grams, wholeItem });
    }
  } catch {
    // Best-effort -- a failed estimate never blocks saving a recipe.
  }
  return result;
}

/**
 * Fills in gramsAtRawQuantity and refines roundsToWhole for whichever
 * ingredients the deterministic passes left unresolved/uncertain, via one
 * batched AI call covering just the gaps. `roundsToWhole` is only ever
 * overwritten for bare-count lines (`unit === null`) -- anything with a
 * real unit of measure already has a confident deterministic answer that
 * the AI's classification shouldn't be able to override.
 * `estimate` is injectable so tests can verify the gap-detection and
 * write-back logic without a network call.
 */
export async function fillMissingIngredientDetails(
  ingredients: ParsedIngredient[],
  estimate: (lines: string[]) => Promise<Map<number, IngredientEstimate>> = estimateIngredientDetailsWithAI,
): Promise<ParsedIngredient[]> {
  const gaps = ingredients
    .map((ingredient, index) => ({ ingredient, index }))
    .filter(({ ingredient }) => ingredient.gramsAtRawQuantity === null && !ingredient.isGroupHeader && ingredient.raw.trim().length > 0);
  if (gaps.length === 0) return ingredients;

  const estimates = await estimate(gaps.map(({ ingredient }) => ingredient.raw));
  if (estimates.size === 0) return ingredients;

  const result = [...ingredients];
  gaps.forEach(({ index }, gapPosition) => {
    const entry = estimates.get(gapPosition);
    if (!entry) return;
    const updates: Partial<ParsedIngredient> = {};
    if (entry.grams !== null) updates.gramsAtRawQuantity = entry.grams;
    if (entry.wholeItem !== null && result[index].unit === null) updates.roundsToWhole = entry.wholeItem;
    if (Object.keys(updates).length > 0) {
      result[index] = { ...result[index], ...updates };
    }
  });
  return result;
}
