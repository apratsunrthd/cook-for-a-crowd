import Anthropic from "@anthropic-ai/sdk";
import type { ParsedIngredient } from "./types";

// Haiku, not Sonnet/Opus -- batched estimation over a short ingredient
// list, not a task that needs a bigger model.
const MODEL = "claude-haiku-4-5";

const WEIGHTS_TOOL: Anthropic.Tool = {
  name: "ingredient_weights",
  description: "Estimated weight in grams for each ingredient line, at the quantity as written.",
  input_schema: {
    type: "object",
    properties: {
      weights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "number", description: "The 0-based index of the ingredient line in the input list." },
            grams: {
              type: "number",
              description: "Best estimate of the total weight in grams for this ingredient at the quantity as written.",
            },
          },
          required: ["index", "grams"],
          additionalProperties: false,
        },
      },
    },
    required: ["weights"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * Best-effort batched gram estimate for ingredient lines the deterministic
 * density table in ingredientWeight.ts couldn't resolve -- unusual
 * ingredients, or count-based lines like "3 large eggs" or "2 cloves
 * garlic" where a typical per-item weight is common cooking knowledge but
 * not something a unit-conversion table can supply. One call covers the
 * whole gap list; lines the model can't reasonably estimate (e.g. "salt to
 * taste") are simply omitted from its response, never guessed.
 */
export async function estimateGramsWithAI(lines: string[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (!process.env.ANTHROPIC_API_KEY || lines.length === 0) return result;

  try {
    const client = new Anthropic();
    const numbered = lines.map((line, i) => `${i}. ${line}`).join("\n");
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [WEIGHTS_TOOL],
      tool_choice: { type: "tool", name: "ingredient_weights" },
      messages: [
        {
          role: "user",
          content: `Estimate the weight in grams of each ingredient line below, at the quantity as written (do not scale it). Use typical cooking/ingredient-density knowledge, including standard per-item weights (e.g. one large egg, one clove of garlic). Leave out any line with no meaningful weight to estimate (e.g. "salt to taste", "for garnish") rather than guessing.\n\n${numbered}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return result;
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return result;

    const data = toolUse.input as { weights: Array<{ index: number; grams: number }> };
    for (const entry of data.weights) {
      if (Number.isFinite(entry.index) && Number.isFinite(entry.grams) && entry.grams > 0) {
        result.set(entry.index, entry.grams);
      }
    }
  } catch {
    // Best-effort -- a failed weight estimate never blocks saving a recipe.
  }
  return result;
}

/**
 * Fills in gramsAtRawQuantity for whichever ingredients the deterministic
 * estimator left null, via one batched AI call covering just the gaps.
 * `estimate` is injectable so tests can verify the gap-detection and
 * write-back logic without a network call.
 */
export async function fillMissingGrams(
  ingredients: ParsedIngredient[],
  estimate: (lines: string[]) => Promise<Map<number, number>> = estimateGramsWithAI,
): Promise<ParsedIngredient[]> {
  const gaps = ingredients
    .map((ingredient, index) => ({ ingredient, index }))
    .filter(({ ingredient }) => ingredient.gramsAtRawQuantity === null && !ingredient.isGroupHeader && ingredient.raw.trim().length > 0);
  if (gaps.length === 0) return ingredients;

  const estimates = await estimate(gaps.map(({ ingredient }) => ingredient.raw));
  if (estimates.size === 0) return ingredients;

  const result = [...ingredients];
  gaps.forEach(({ index }, gapPosition) => {
    const grams = estimates.get(gapPosition);
    if (grams !== undefined) {
      result[index] = { ...result[index], gramsAtRawQuantity: grams };
    }
  });
  return result;
}
