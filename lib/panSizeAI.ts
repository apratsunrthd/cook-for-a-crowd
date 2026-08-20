import Anthropic from "@anthropic-ai/sdk";
import type { PanSize } from "./panSize";
import type { ImportedRecipeDraft } from "./recipeImport";
import { getAnthropicApiKey } from "./settings";

// Haiku, not Sonnet/Opus -- this is a small extraction task (does this text
// mention a pan size, and what is it), not something that needs a bigger
// model. Used as a fallback only when the free regex-based extractor in
// panSizeExtract.ts comes up empty, to keep this off the hot path.
const MODEL = "claude-haiku-4-5";
const MAX_INPUT_CHARS = 4000;

const PAN_SIZE_TOOL: Anthropic.Tool = {
  name: "pan_size",
  description: "The baking pan, dish, or vessel size the recipe calls for, if any is stated.",
  input_schema: {
    type: "object",
    properties: {
      found: {
        type: "boolean",
        description: "Whether the text explicitly states a specific pan/dish/vessel size. False if none is mentioned, or it's just implied/generic (e.g. plain \"a baking dish\" with no size).",
      },
      shape: {
        type: "string",
        enum: ["rectangle", "round", "pot"],
        description:
          'Required when found is true. A square pan is "rectangle" with equal width and height. Use "pot" for a stovetop pot/stockpot/Dutch oven rather than a baking pan.',
      },
      widthIn: { type: "number", description: "Width in inches, for shape=rectangle." },
      heightIn: { type: "number", description: "Length in inches, for shape=rectangle." },
      diameterIn: { type: "number", description: "Diameter in inches, for shape=round." },
      quartsCapacity: { type: "number", description: "Capacity in quarts, for shape=pot." },
    },
    required: ["found"],
    additionalProperties: false,
  },
  strict: true,
};

interface PanSizeToolInput {
  found: boolean;
  shape?: "rectangle" | "round" | "pot";
  widthIn?: number;
  heightIn?: number;
  diameterIn?: number;
  quartsCapacity?: number;
}

/** Pure mapping from the tool's structured output to our PanSize type -- split out so it's testable without a network call. */
export function toolInputToPanSize(data: PanSizeToolInput): PanSize | null {
  if (!data.found) return null;
  if (data.shape === "round" && data.diameterIn) {
    return { shape: "round", diameterIn: data.diameterIn };
  }
  if (data.shape === "pot" && data.quartsCapacity) {
    return { shape: "pot", quartsCapacity: data.quartsCapacity };
  }
  if (data.shape === "rectangle" && data.widthIn && data.heightIn) {
    return { shape: "rectangle", widthIn: data.widthIn, heightIn: data.heightIn };
  }
  return null;
}

/**
 * Asks Haiku to find a stated pan/dish size in free-text recipe content.
 * Best-effort: returns null (never throws) on any failure -- missing API
 * key, refusal, network error -- so a pan-size miss never breaks the rest
 * of a recipe import.
 */
export async function detectPanSizeWithAI(text: string): Promise<PanSize | null> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return null;
  if (!text.trim()) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      tools: [PAN_SIZE_TOOL],
      tool_choice: { type: "tool", name: "pan_size" },
      messages: [
        {
          role: "user",
          content: `What baking pan, dish, or vessel size does this recipe call for? Only report one if a specific size is explicitly stated somewhere in the text -- don't guess or infer from the dish type.\n\n${text.slice(0, MAX_INPUT_CHARS)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return null;

    return toolInputToPanSize(toolUse.input as PanSizeToolInput);
  } catch {
    return null;
  }
}

/**
 * The regex extractor in panSizeExtract.ts runs first (free, catches most
 * explicit "9x13 pan" / "8-inch round" phrasing) and already populates
 * `draft.panSize` where it can. This fills the gap with the AI fallback
 * only when that came up empty, so most imports never pay for the API call.
 */
export async function fillPanSizeGap(draft: ImportedRecipeDraft): Promise<ImportedRecipeDraft> {
  if (draft.panSize) return draft;
  const combined = [draft.name, draft.instructions, ...draft.ingredients.map((i) => i.raw)]
    .filter((part): part is string => !!part)
    .join("\n");
  const panSize = await detectPanSizeWithAI(combined);
  return panSize ? { ...draft, panSize } : draft;
}
