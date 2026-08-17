import { parseIngredientLines } from "./ingredientParser";
import type { ImportedRecipeDraft } from "./recipeImport";

const INGREDIENT_HEADING = /^ingredients?\b/i;
const INSTRUCTION_HEADING = /^(instructions?|directions?|method|steps?)\b/i;
const OTHER_HEADING = /^(notes?|nutrition|tips?|for the .+:?)$/i;
const YIELD_PATTERN = /\b(?:serves|servings?|yields?|makes)\b\D{0,10}(\d+)/i;

/**
 * Heuristically parses a recipe from plain text a user copy-pasted off a
 * webpage (not HTML source) -- title, an "Ingredients" section, an
 * "Instructions"/"Directions" section, and a yield hint if present. Much
 * fuzzier than the JSON-LD path, but gives a real starting point for the
 * common case where a recipe page uses those two headings, which is nearly
 * universal on recipe sites.
 */
export function parseRecipeFromPlainText(text: string): ImportedRecipeDraft {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const ingredientStart = lines.findIndex((line) => INGREDIENT_HEADING.test(line));
  const instructionStart = lines.findIndex((line) => INSTRUCTION_HEADING.test(line));

  let ingredientLines: string[];
  let instructionLines: string[];
  let name: string;

  if (ingredientStart !== -1) {
    name = lines.slice(0, ingredientStart).find((line) => line.length > 2) ?? "Untitled recipe";
    const ingredientEnd =
      instructionStart > ingredientStart
        ? instructionStart
        : findNextHeading(lines, ingredientStart + 1);
    ingredientLines = lines.slice(ingredientStart + 1, ingredientEnd);
    instructionLines =
      instructionStart !== -1
        ? lines.slice(instructionStart + 1, findNextHeading(lines, instructionStart + 1))
        : [];
  } else {
    // No recognizable "Ingredients" heading -- fall back to treating every
    // line as a candidate ingredient. Lines with no leading quantity get
    // flagged needsReview by the parser, so this degrades gracefully into
    // a starting point the user edits rather than silent garbage.
    name = lines[0] ?? "Untitled recipe";
    ingredientLines = lines.slice(1);
    instructionLines = [];
  }

  const yieldMatch = text.match(YIELD_PATTERN);

  return {
    name,
    sourceUrl: null,
    servings: yieldMatch ? Number(yieldMatch[1]) : null,
    rawYieldText: yieldMatch ? yieldMatch[0] : null,
    ingredients: parseIngredientLines(ingredientLines),
    instructions: instructionLines.length > 0 ? instructionLines.join("\n") : null,
    imageUrl: null,
  };
}

function findNextHeading(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    if (INGREDIENT_HEADING.test(lines[i]) || INSTRUCTION_HEADING.test(lines[i]) || OTHER_HEADING.test(lines[i])) {
      return i;
    }
  }
  return lines.length;
}
