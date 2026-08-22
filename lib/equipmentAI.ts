import Anthropic from "@anthropic-ai/sdk";
import { cache } from "react";
import { formatPanSize, sameVesselFamily, servingsPerPan, vesselNoun, vesselPresetName, type PanSize } from "./panSize";
import { batchesNeeded } from "./scale";
import { getAnthropicApiKey } from "./settings";
import type { Course } from "./types";

// Haiku -- this is extraction/classification, not creative generation.
const MODEL = "claude-haiku-4-5-20251001";

// Minimal shape needed from a CookPlanDish -- avoids importing from components/.
export interface DishForEquipment {
  recipe: {
    name: string;
    servings: number | null;
    panSize: PanSize | null;
  };
  course: Course;
  variants: Array<{
    variant: {
      label: string;
      servings: number;
      panSize: PanSize | null;
    };
  }>;
}

export interface VesselItem {
  count: number;
  /** e.g. "Half-size steam table pan (12.75" x 10.375")" or, for a custom size with no preset match, just "12.75" x 10.375" pan". */
  displayName: string;
  dishName: string;
  variantLabel: string | null;
}

/** A vessel's full display name -- its familiar preset name plus dimensions when it matches a PAN_PRESETS entry ("Half-size steam table pan (12.75" x 10.375")"), or just dimensions with the pot/pan noun otherwise. */
function vesselDisplayName(size: PanSize): string {
  const dims = formatPanSize(size);
  const presetName = vesselPresetName(size);
  if (presetName) {
    // A pot preset's name already spells out its capacity ("12 qt stock
    // pot") -- appending dims would just repeat "12 qt pot" a second time.
    // A pan preset's name doesn't say how big it is ("Half-size steam
    // table pan"), so dims are worth adding there.
    return size.shape === "pot" ? presetName : `${presetName} (${dims})`;
  }
  // formatPanSize already spells out "qt pot" for a pot -- only a pan needs
  // the noun appended to read as a vessel ("12.75" x 10.375" pan").
  return vesselNoun(size) === "pot" ? dims : `${dims} pan`;
}

export interface EquipmentItem {
  item: string;
  quantity: string;
  note?: string;
}

export interface EquipmentSuggestions {
  cookingEquipment: EquipmentItem[];
  servingWare: EquipmentItem[];
}

/** Deterministically derives the cooking vessel requirements from dish data. */
export function computeVessels(dishes: DishForEquipment[]): VesselItem[] {
  const vessels: VesselItem[] = [];
  for (const dish of dishes) {
    for (const { variant } of dish.variants) {
      const panSize = variant.panSize ?? dish.recipe.panSize;
      if (!panSize) continue;
      const inSameFamily =
        panSize && dish.recipe.panSize ? sameVesselFamily(dish.recipe.panSize, panSize) : false;
      const perPanServings =
        dish.recipe.servings && inSameFamily && dish.recipe.panSize
          ? servingsPerPan(dish.recipe.servings, dish.recipe.panSize, panSize)
          : inSameFamily
            ? dish.recipe.servings
            : null;
      const batches = perPanServings ? batchesNeeded(variant.servings, perPanServings) : null;
      if (!batches) continue;
      vessels.push({
        count: batches,
        displayName: vesselDisplayName(panSize),
        dishName: dish.recipe.name,
        variantLabel: dish.variants.length > 1 ? variant.label : null,
      });
    }
  }
  return vessels;
}

const EQUIPMENT_TOOL: Anthropic.Tool = {
  name: "equipment_list",
  description: "Practical equipment needed to cook and serve a group meal, excluding the cooking vessels (pans/pots) which are already listed separately.",
  input_schema: {
    type: "object",
    properties: {
      cookingEquipment: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string", description: 'e.g. "Large mixing bowls", "Colander"' },
            quantity: { type: "string", description: 'e.g. "2", "1 large", "several"' },
            note: { type: "string", description: "Short context note, optional" },
          },
          required: ["item", "quantity"],
          additionalProperties: false,
        },
      },
      servingWare: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string", description: 'e.g. "Serving spoon", "Ladle", "Tongs"' },
            quantity: { type: "string", description: 'e.g. "1 per pan", "2", "4"' },
            note: { type: "string", description: 'Short context, e.g. "for green beans"' },
          },
          required: ["item", "quantity"],
          additionalProperties: false,
        },
      },
    },
    required: ["cookingEquipment", "servingWare"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * AI-suggested cooking equipment and serving ware for the given menu.
 * Cached per React render so two components on the same page share one call.
 * Returns null if no API key is configured or the call fails.
 */
export const suggestEquipment = cache(async (
  dishes: DishForEquipment[],
  headcount: number,
): Promise<EquipmentSuggestions | null> => {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return null;

  const anthropic = new Anthropic({ apiKey });

  const dishSummary = dishes
    .map((d) => {
      const variants =
        d.variants.length > 1 ? ` [variants: ${d.variants.map((v) => v.variant.label).join(", ")}]` : "";
      return `${d.recipe.name} (${d.course})${variants}`;
    })
    .join("; ");

  const vesselSummary = computeVessels(dishes)
    .map((v) => `${v.count}× ${v.displayName} for ${v.dishName}${v.variantLabel ? ` (${v.variantLabel})` : ""}`)
    .join("; ");

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [EQUIPMENT_TOOL],
      tool_choice: { type: "tool", name: "equipment_list" },
      messages: [
        {
          role: "user",
          content: `List the practical equipment needed to cook and serve a meal for ${headcount} people. Dishes: ${dishSummary}. Cooking vessels already planned: ${vesselSummary}. Do NOT re-list the cooking vessels -- just the additional prep equipment (mixing bowls, strainers, whisks, ladles for stirring, etc.) and serving ware (serving spoons, tongs, ladles, chafing dishes, etc.). One serving ware entry per dish. Be specific and concise -- items a volunteer cook would need to gather.`,
        },
      ],
    });
  } catch {
    return null;
  }

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) return null;

  return toolUse.input as EquipmentSuggestions;
});
