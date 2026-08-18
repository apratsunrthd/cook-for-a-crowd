import { describe, expect, it } from "vitest";
import { guessRoundsToWhole } from "../ingredientDivisibility";
import { parseIngredientLine } from "../ingredientParser";

describe("guessRoundsToWhole", () => {
  it("treats a bare-count whole food item as rounding to whole numbers", () => {
    expect(parseIngredientLine("4 skinless, boneless chicken breast halves").roundsToWhole).toBe(true);
    expect(parseIngredientLine("3 large eggs").roundsToWhole).toBe(true);
    expect(parseIngredientLine("1 onion, diced").roundsToWhole).toBe(true);
  });

  it("treats a bare-count container word as divisible, not a whole item", () => {
    expect(parseIngredientLine("1 sleeve buttery round crackers, crushed").roundsToWhole).toBe(false);
    expect(parseIngredientLine("2 (15 oz) cans green beans, drained").roundsToWhole).toBe(false);
    expect(parseIngredientLine("1 package cream cheese").roundsToWhole).toBe(false);
  });

  it("treats any ingredient with a recognized unit of measure as divisible", () => {
    expect(parseIngredientLine("2 cups flour").roundsToWhole).toBe(false);
    expect(parseIngredientLine("1 clove garlic, minced").roundsToWhole).toBe(false);
    expect(parseIngredientLine("2 cans green beans").roundsToWhole).toBe(false);
  });

  it("is case-insensitive on the container keyword", () => {
    expect(guessRoundsToWhole({ unit: null, description: "Can green beans" })).toBe(false);
  });
});
