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
          'The vessel this recipe is made in. REQUIRED (infer a sensible one, even if the request never mentions a size) for any dish normally made in a specific pan or pot -- baked/casserole dishes, rice, soups, chilis, pasta, beans, anything simmered or boiled all need one. A square pan is "rectangle" with equal width and height; "pot" is for stovetop pot/stockpot/Dutch oven dishes. Omit ONLY for genuinely vessel-agnostic dishes (a salad, a sandwich, a spice rub, a dip served cold).',
      },
      panWidthIn: { type: "number", description: "Pan width in inches, when panShape is rectangle." },
      panHeightIn: { type: "number", description: "Pan length in inches, when panShape is rectangle." },
      panDiameterIn: { type: "number", description: "Pan diameter in inches, when panShape is round." },
      panQuartsCapacity: {
        type: "number",
        description:
          'Pot capacity in quarts, when panShape is pot. Must reflect a REALISTIC fill for that pot, not just scale linearly with servings -- a 12-quart stockpot realistically cooks about 12-14 cups of dry rice (with its water) at a rolling boil, not 5-6 and not 25-30. Ground this in how full a real pot of that size would actually be with the ingredient quantities you wrote, the same way you\'d judge a baking pan\'s size from a batter\'s volume.',
      },
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
          content: `Write a simple, practical home-cook recipe for: ${prompt.trim()}. Keep ingredient lines in standard recipe format, e.g. "2 cups flour" or "1 (15 oz) can black beans". ${COURSE_GUIDANCE[course]} Always determine a specific pan or pot size for this dish, inferring one yourself from what's normally used even when the request doesn't mention a size -- rice and soup need a pot, a casserole needs a baking dish; only skip this for dishes that genuinely don't use a specific vessel (a salad, a sandwich). Size the servings count AND every ingredient quantity to realistically fill whatever vessel you land on -- they must agree with each other and with a REAL vessel of that size's actual fill capacity, not just scale together arbitrarily. For a pot specifically, ground it in real cooking capacity: a 12-quart stockpot realistically cooks about 12-14 cups of dry rice, not 5-6 (too little, wastes the pot) and not 25-30 (won't fit/cook properly) -- the same logic applies to pasta, beans, soup, etc. If the request itself mentions or implies a specific size, use that instead of picking your own.`,
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
