import Anthropic from "@anthropic-ai/sdk";
import { parseIngredientLines } from "./ingredientParser";
import { STANDARD_POT_QUARTS } from "./panSize";
import { toolInputToPanSize } from "./panSizeAI";
import { guessPanSize } from "./panSizeExtract";
import { correctPotSizeForBulkIngredient } from "./potCapacity";
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
        enum: STANDARD_POT_QUARTS,
        description:
          "Pot capacity in quarts, when panShape is pot. MUST be one of these standard sizes people actually own -- pick the SMALLEST one that comfortably fits the ingredient quantities with reasonable headroom for a boil/simmer. There is no requirement to fill a pot to its maximum capacity: 2 cups of dry rice belongs in the 2-quart pot, not a 3-quart or larger one just because it also technically holds it. A 12-quart stockpot's realistic max is around 12-14 cups of dry rice, but that's a ceiling, not a target -- don't scale a small batch up just to fill a bigger pot.",
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

/** A previously-generated draft plus what the user didn't like about it, for a revision pass instead of a fresh roll. */
export interface RecipeRevisionContext {
  name: string;
  servings: number | null;
  ingredientLines: string[];
  instructions: string | null;
  feedback: string;
}

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

export async function generateRecipeWithAI(
  prompt: string,
  course: Course,
  targetHeadcount?: number | null,
  revision?: RecipeRevisionContext | null,
): Promise<ImportedRecipeDraft> {
  const anthropic = getClient();

  const servingsInstruction =
    targetHeadcount && targetHeadcount > 0
      ? `Size the servings count AND every ingredient quantity for exactly ${targetHeadcount} people -- not a generic single batch, the actual target headcount.`
      : "Size it for a normal single-batch serving count.";

  const introduction = revision
    ? `You previously wrote this recipe for the request "${prompt.trim()}":\nName: ${revision.name}\nServings: ${revision.servings ?? "unknown"}\nIngredients:\n${revision.ingredientLines.join("\n")}\nInstructions:\n${revision.instructions ?? ""}\n\nThe user has this feedback on it: "${revision.feedback.trim()}"\n\nRevise the recipe to address the feedback -- keep everything else about it reasonable unless the feedback implies otherwise.`
    : `Write a simple, practical home-cook recipe for: ${prompt.trim()}.`;

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
          content: `${introduction} Keep ingredient lines in standard recipe format, e.g. "2 cups flour" or "1 (15 oz) can black beans". ${COURSE_GUIDANCE[course]} ${servingsInstruction}

Always determine a specific pan or pot size for this dish, inferring one yourself even when the request doesn't mention a size -- rice and soup need a pot, a casserole needs a baking dish; only skip this for genuinely vessel-agnostic dishes (a salad, a sandwich).

When picking a pot size, base it ONLY on how much of the bulk ingredient (rice, pasta, beans, the total liquid, etc.) the recipe actually calls for -- NOT on the headcount or servings number directly, and NOT by assuming a bigger headcount needs a bigger pot. Use real capacity guidelines: a 2-quart pot realistically holds about 2 cups of dry rice, a 6-quart pot about 6-7 cups, a 12-quart pot about 12-14 cups, a 20-quart pot about 20-24 cups; a soup or chili pot can fill closer to its full rated volume (roughly 3.5-4 cups of liquid per quart) since it's mostly liquid. Pick the SMALLEST standard size (2, 4, 6, 8, 12, 16, 20, or 32 quarts) whose realistic capacity comfortably covers the bulk ingredient quantity you actually wrote -- there's no requirement to fill it to the brim, and a large headcount does not by itself justify a large pot if the resulting ingredient quantity is modest.

If the request itself mentions or implies a specific size, use that instead of picking your own.`,
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

  const ingredients = parseIngredientLines(data.ingredients);

  const rawPanSize =
    toolInputToPanSize({
      found: !!data.panShape,
      shape: data.panShape,
      widthIn: data.panWidthIn,
      heightIn: data.panHeightIn,
      diameterIn: data.panDiameterIn,
      quartsCapacity: data.panQuartsCapacity,
    }) ?? guessPanSize({ name: data.name, instructions: data.instructions, ingredientLines: data.ingredients });
  // Sonnet is unreliable at picking the smallest of the standard pot sizes
  // even with explicit numeric guidance -- recompute it deterministically
  // from the recipe's own bulk ingredient quantity instead of trusting it.
  const panSize = correctPotSizeForBulkIngredient(ingredients, rawPanSize);

  return {
    name: data.name,
    sourceUrl: null,
    servings: data.servings,
    rawYieldText: null,
    ingredients,
    instructions: data.instructions,
    imageUrl: null,
    panSize,
  };
}
