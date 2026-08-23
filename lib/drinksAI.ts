import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "./settings";

// Sonnet, not Haiku -- this needs actual regional/cultural judgment (e.g.
// sweet tea vastly outdrawing unsweet at a Southern U.S. event), closer to
// the creative-generation task in aiRecipe.ts than a narrow extraction/
// classification call.
const MODEL = "claude-sonnet-5";

export class DrinkSuggestionError extends Error {}

const SUGGESTIONS_TOOL: Anthropic.Tool = {
  name: "drink_suggestions",
  description: "Suggested drink lineup and quantities for a group event.",
  input_schema: {
    type: "object",
    properties: {
      drinks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: 'e.g. "Sweet tea", "Unsweet tea", "Lemonade", "Bottled water"' },
            expectedDrinkers: {
              type: "number",
              description:
                "How many of the total attendees are expected to primarily choose this drink. Should reflect realistic regional/event-type preferences (e.g. sweet tea is usually far more popular than unsweet at a Southern U.S. event) rather than an even split, and should sum to roughly the total headcount across all suggested drinks.",
            },
            packageSizeOz: {
              type: "number",
              description:
                "Realistic fluid-oz size of one purchasable/makeable unit for this drink -- 128 for a gallon jug (typical for tea or lemonade made or bought in bulk), 12 for a can, 16.9 for a standard bottle, etc.",
            },
            unitLabel: { type: "string", description: 'Label for one purchased unit, e.g. "gallon", "can", "bottle".' },
          },
          required: ["name", "expectedDrinkers", "packageSizeOz", "unitLabel"],
          additionalProperties: false,
        },
      },
    },
    required: ["drinks"],
    additionalProperties: false,
  },
  strict: true,
};

export interface SuggestedDrink {
  name: string;
  expectedDrinkers: number;
  packageSizeOz: number;
  unitLabel: string;
}

function getClient(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new DrinkSuggestionError(
      "AI drink suggestions aren't set up yet. Add your Anthropic API key on the Settings page.",
    );
  }
  // Not cached at module level -- see the identical comment in
  // aiRecipe.ts's getClient().
  return new Anthropic({ apiKey });
}

/**
 * Suggests a realistic drink lineup and how the headcount splits across it
 * -- e.g. "tea and lemonade for a Southern scout court of honor" should
 * expand "tea" into both sweet and unsweet, weighted toward sweet, rather
 * than splitting evenly across whatever's requested. The suggestions are
 * a starting point for the user to review and adjust before saving, same
 * as every other AI estimate in this app.
 */
export async function suggestDrinksWithAI(params: {
  request: string;
  headcount: number;
  servingSizeOz: number;
  eventContext: string;
}): Promise<SuggestedDrink[]> {
  const anthropic = getClient();

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [SUGGESTIONS_TOOL],
      tool_choice: { type: "tool", name: "drink_suggestions" },
      messages: [
        {
          role: "user",
          content: `Suggest a drink lineup for a group event. Event: ${params.eventContext}. Total headcount: ${params.headcount} people, each expected to drink about ${params.servingSizeOz}oz total of whichever drink they choose. Requested drink categories: "${params.request.trim()}" -- expand a general category into specific realistic options where customary for this kind of event (e.g. "tea" at a Southern U.S. event typically means offering both sweet and unsweet tea, not just one, with sweet tea usually far more popular). Suggest how many of the ${params.headcount} attendees will likely choose each option based on realistic regional and event-type preferences -- don't just split evenly unless there's genuinely no reason to expect otherwise -- and a realistic bulk-purchase package for each (gallon jugs are typical for tea/lemonade, cans or bottles for soda/water).`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new DrinkSuggestionError(`AI drink suggestion failed: ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new DrinkSuggestionError("The AI declined to suggest drinks for that. Try rephrasing.");
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new DrinkSuggestionError("The AI didn't return any suggestions. Try again.");
  }

  const data = toolUse.input as { drinks: SuggestedDrink[] };
  return data.drinks.filter(
    (d) =>
      d.name.trim().length > 0 &&
      d.expectedDrinkers > 0 &&
      d.packageSizeOz > 0 &&
      typeof d.unitLabel === "string" &&
      d.unitLabel.length > 0 &&
      d.unitLabel.length <= 30 &&
      /^[a-zA-Z\s/]+$/.test(d.unitLabel.trim()),
  );
}
