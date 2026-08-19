import Anthropic from "@anthropic-ai/sdk";

// Sonnet, not Haiku -- this needs real multi-step numeric/domain reasoning
// (figure out the bulk ingredient, ground its fill volume in a real
// reference point, derive a scaling factor), closer to the judgment calls
// in aiRecipe.ts than a narrow extraction/classification task Haiku
// handles fine.
const MODEL = "claude-sonnet-5";

const POT_FILL_TOOL: Anthropic.Tool = {
  name: "pot_fill_estimate",
  description: "Estimates the realistic bulk-ingredient fill quantity for a recipe scaled to a given pot size.",
  input_schema: {
    type: "object",
    properties: {
      bulkIngredient: {
        type: "string",
        description:
          'The ingredient that determines how full the pot gets -- "rice", "pasta", "dried beans", or for a soup/chili/mostly-liquid dish, "liquid" (the total volume of broth/liquid).',
      },
      currentBulkQuantityCups: {
        type: "number",
        description: "The bulk ingredient's current quantity, in cups, at the recipe's current servings (read this from the ingredient list).",
      },
      targetBulkQuantityCups: {
        type: "number",
        description:
          "A realistic quantity of that same ingredient, in cups, that would fill the target pot without overfilling or underfilling it. Ground this in a real reference point: a 12-quart stockpot realistically cooks about 12-14 cups of dry rice (not 5-6, not 25-30); a soup or chili pot can fill closer to its full rated volume, roughly 3.5-4 cups of liquid per quart, since it's mostly liquid.",
      },
    },
    required: ["bulkIngredient", "currentBulkQuantityCups", "targetBulkQuantityCups"],
    additionalProperties: false,
  },
  strict: true,
};

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

/**
 * A grounded "double-check" for the servings-to-vessel relationship, used
 * when a recipe is being assigned or resized to a specific pot -- rather
 * than leaving the user to eyeball a number (or leaving pure area/quart
 * ratio math with nothing to check it against), this asks what a REAL pot
 * of that size would actually hold of this specific dish's bulk ingredient.
 * The servings scale-factor is computed here from the model's own stated
 * current/target cup quantities rather than trusting an LLM to do the final
 * division itself -- division is exactly the kind of arithmetic a model can
 * get subtly wrong even when its domain judgment (the cup estimates) is
 * sound. Best-effort: returns null on any failure rather than blocking the
 * save/resize flow.
 */
export async function suggestServingsForPot(params: {
  ingredientLines: string[];
  currentServings: number;
  quartsCapacity: number;
}): Promise<number | null> {
  const anthropic = getClient();
  if (!anthropic || params.ingredientLines.length === 0 || params.quartsCapacity <= 0) return null;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      output_config: { effort: "low" },
      tools: [POT_FILL_TOOL],
      tool_choice: { type: "tool", name: "pot_fill_estimate" },
      messages: [
        {
          role: "user",
          content: `This recipe currently makes ${params.currentServings} servings:\n${params.ingredientLines.join("\n")}\n\nIdentify the main bulk ingredient that determines how full a cooking vessel gets, and its current quantity in cups. Then estimate a realistic quantity of that same ingredient, in cups, that would fill a ${params.quartsCapacity}-quart pot without overfilling or underfilling it.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return null;

    const data = toolUse.input as {
      bulkIngredient: string;
      currentBulkQuantityCups: number;
      targetBulkQuantityCups: number;
    };
    if (!Number.isFinite(data.currentBulkQuantityCups) || data.currentBulkQuantityCups <= 0) return null;
    if (!Number.isFinite(data.targetBulkQuantityCups) || data.targetBulkQuantityCups <= 0) return null;

    const factor = data.targetBulkQuantityCups / data.currentBulkQuantityCups;
    const suggestedServings = Math.round(params.currentServings * factor);
    return suggestedServings > 0 ? suggestedServings : null;
  } catch {
    return null;
  }
}
