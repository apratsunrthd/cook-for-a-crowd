import Anthropic from "@anthropic-ai/sdk";
import { parseIngredientLines } from "./ingredientParser";
import { toolInputToPanSize } from "./panSizeAI";
import { guessPanSize } from "./panSizeExtract";
import type { ImportedRecipeDraft } from "./recipeImport";
import type { Course } from "./types";

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
      panShape: {
        type: "string",
        enum: ["rectangle", "round", "pot"],
        description:
          'The vessel this recipe is made in, if it has a specific size worth recording. A square pan is "rectangle" with equal width and height. Use "pot" for a stovetop pot/stockpot/Dutch oven recipe (e.g. rice, soup, chili) instead of a baking pan. Omit entirely when no specific vessel size applies.',
      },
      panWidthIn: { type: "number", description: "Pan width in inches, when panShape is rectangle." },
      panHeightIn: { type: "number", description: "Pan length in inches, when panShape is rectangle." },
      panDiameterIn: { type: "number", description: "Pan diameter in inches, when panShape is round." },
      panQuartsCapacity: { type: "number", description: "Pot capacity in quarts, when panShape is pot." },
    },
    required: ["name", "servings", "ingredients", "instructions"],
    additionalProperties: false,
  },
  strict: true,
};

// People eat noticeably less of a side or dessert than a main, especially
// at a buffet-style group meal where several dishes share the plate -- a
// naive per-serving multiply (or a package's nutrition-label serving count)
// tends to produce oversized side quantities, e.g. 2 full cans of green
// beans for 6 people when a can realistically stretches much further as a
// modest side than its label's "3.5 servings" implies.
const COURSE_GUIDANCE: Record<Course, string> = {
  main: "This is a main dish -- size it for a normal, full main-course portion per person.",
  side:
    "This is a SIDE dish, sharing the plate with a main and other sides -- people take noticeably less of it than they would if it were the only dish. For a vegetable side specifically, plan on roughly 1/3 to 1/2 cup per person, not a full cup. Do not size canned/packaged quantities by multiplying the package's printed nutrition-label serving count by the number of guests -- that label serving is meant for the food as a whole meal and badly overestimates a shared side portion. A standard ~14.5oz can of vegetables, which lists around 3.5 servings on its label, realistically stretches to 5-6 side-dish portions at a group meal -- so for 6 people, one can is often enough.",
  dessert:
    "This is a dessert. Use a modest, realistic per-person portion -- at a group event people often take a smaller taste of dessert, not a full stand-alone dessert serving.",
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

export async function generateRecipeWithAI(prompt: string, course: Course): Promise<ImportedRecipeDraft> {
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
          content: `Write a simple, practical home-cook recipe for: ${prompt.trim()}. Keep ingredient lines in standard recipe format, e.g. "2 cups flour" or "1 (15 oz) can black beans". ${COURSE_GUIDANCE[course]} Size it for a normal single-batch serving count.`,
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
    panShape?: "rectangle" | "round" | "pot";
    panWidthIn?: number;
    panHeightIn?: number;
    panDiameterIn?: number;
    panQuartsCapacity?: number;
  };

  const panSize =
    toolInputToPanSize({
      found: !!data.panShape,
      shape: data.panShape,
      widthIn: data.panWidthIn,
      heightIn: data.panHeightIn,
      diameterIn: data.panDiameterIn,
      quartsCapacity: data.panQuartsCapacity,
    }) ?? guessPanSize({ name: data.name, instructions: data.instructions, ingredientLines: data.ingredients });

  return {
    name: data.name,
    sourceUrl: null,
    servings: data.servings,
    rawYieldText: null,
    ingredients: parseIngredientLines(data.ingredients),
    instructions: data.instructions,
    imageUrl: null,
    panSize,
  };
}
