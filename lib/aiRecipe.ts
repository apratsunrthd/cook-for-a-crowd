import Anthropic from "@anthropic-ai/sdk";
import { parseIngredientLines } from "./ingredientParser";
import type { ImportedRecipeDraft } from "./recipeImport";

// Sonnet 5, not Opus -- this is a small structured-output call, not a task
// that needs Opus-tier reasoning. Thinking stays on its default (adaptive)
// rather than disabled, and `effort: "low"` keeps it fast and cheap.
const MODEL = "claude-sonnet-5";

export class RecipeGenerationError extends Error {}

const RECIPE_TOOL: Anthropic.Tool = {
  name: "recipe",
  description: "Structured recipe output.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Recipe name" },
      servings: { type: "number", description: "How many people this recipe serves" },
      ingredients: {
        type: "array",
        items: { type: "string" },
        description: 'Ingredient lines in standard recipe format, e.g. "2 cups flour"',
      },
      instructions: { type: "string", description: "Step-by-step cooking instructions" },
    },
    required: ["name", "servings", "ingredients", "instructions"],
    additionalProperties: false,
  },
  strict: true,
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new RecipeGenerationError(
      "AI recipe generation isn't set up yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

export async function generateRecipeWithAI(prompt: string): Promise<ImportedRecipeDraft> {
  const anthropic = getClient();

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      output_config: { effort: "low" },
      tools: [RECIPE_TOOL],
      tool_choice: { type: "tool", name: "recipe" },
      messages: [
        {
          role: "user",
          content: `Write a simple, practical home-cook recipe for: ${prompt.trim()}. Keep ingredient lines in standard recipe format, e.g. "2 cups flour" or "1 (15 oz) can black beans". Size it for a normal single-batch serving count.`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new RecipeGenerationError(`AI recipe generation failed: ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new RecipeGenerationError("The AI declined to generate that recipe. Try rephrasing.");
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new RecipeGenerationError("The AI didn't return a recipe. Try again.");
  }

  const data = toolUse.input as {
    name: string;
    servings: number;
    ingredients: string[];
    instructions: string;
  };

  return {
    name: data.name,
    sourceUrl: null,
    servings: data.servings,
    rawYieldText: null,
    ingredients: parseIngredientLines(data.ingredients),
    instructions: data.instructions,
    imageUrl: null,
  };
}
