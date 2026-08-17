import { PAN_PRESETS, type PanSize } from "./panSize";

const SHEET_PRESETS: Array<{ pattern: RegExp; presetId: string }> = [
  { pattern: /quarter[\s-]sheet\s*pan/i, presetId: "9x13" }, // a quarter sheet pan is the same size as a 9x13
  { pattern: /half[\s-]sheet\s*pan/i, presetId: "half-sheet" },
  { pattern: /full[\s-]sheet\s*pan/i, presetId: "full-sheet" },
];

/**
 * Looks for a pan/dish size mentioned in free-text recipe content (most
 * often the instructions, e.g. "Pour into a greased 9x13-inch baking dish").
 * Regex-based and deliberately conservative -- returns null rather than
 * guessing when nothing clearly reads as a pan size.
 */
export function extractPanSizeFromText(text: string): PanSize | null {
  for (const { pattern, presetId } of SHEET_PRESETS) {
    if (pattern.test(text)) {
      const preset = PAN_PRESETS.find((p) => p.id === presetId);
      if (preset) return preset.size;
    }
  }

  // Round: "8-inch round cake pan", "9 inch springform pan", "10-inch pie plate"
  const roundMatch = text.match(
    /(\d+(?:\.\d+)?)[\s-]*(?:"|inch(?:es)?)\s*(?:round\s*)?(?:cake\s*pan|springform(?:\s*pan)?|pie\s*(?:plate|pan)|round\s*pan)\b/i,
  );
  if (roundMatch) {
    return { shape: "round", diameterIn: Number(roundMatch[1]) };
  }

  // Rectangular: "9x13 pan", "9x13-inch baking dish", "13 x 9 inch pan", "9-by-13"
  // Only accepted when it's clearly a pan measurement -- an inch/quote marker,
  // or a pan/dish word nearby -- so we don't mistake "make 2x the recipe" or
  // similar for a dimension.
  const rectPattern =
    /(\d+(?:\.\d+)?)\s*(?:"|inch(?:es)?)?[\s-]*(?:x|×|by)[\s-]*(\d+(?:\.\d+)?)\s*(?:"|inch(?:es)?)?/gi;
  for (const match of text.matchAll(rectPattern)) {
    const hasUnitMarker = /"|inch/i.test(match[0]);
    const nearby = text.slice(match.index, match.index + match[0].length + 40);
    const hasPanWord = /inch|"|pan|dish|casserole|baking/i.test(nearby);
    if (hasUnitMarker || hasPanWord) {
      return { shape: "rectangle", widthIn: Number(match[1]), heightIn: Number(match[2]) };
    }
  }

  return null;
}

export function guessPanSize(parts: {
  name?: string | null;
  instructions?: string | null;
  ingredientLines?: string[];
}): PanSize | null {
  const combined = [parts.name, parts.instructions, ...(parts.ingredientLines ?? [])]
    .filter((part): part is string => !!part)
    .join("\n");
  if (!combined.trim()) return null;
  return extractPanSizeFromText(combined);
}
