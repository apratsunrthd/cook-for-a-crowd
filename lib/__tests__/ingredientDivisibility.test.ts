import { describe, expect, it } from "vitest";
import { guessRoundsToWhole, isContainerItem } from "../ingredientDivisibility";
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

describe("isContainerItem", () => {
  it("is true for a recognized container unit", () => {
    expect(isContainerItem({ unit: "can", description: "condensed cream of chicken soup" })).toBe(true);
    expect(isContainerItem({ unit: "container", description: "sour cream" })).toBe(true);
  });

  it("is true for a bare-count line with a leading container word", () => {
    expect(isContainerItem({ unit: null, description: "sleeve buttery round crackers, crushed" })).toBe(true);
  });

  it("is false for a genuine whole food item or a continuous unit", () => {
    expect(isContainerItem({ unit: null, description: "skinless, boneless chicken breast halves" })).toBe(false);
    expect(isContainerItem({ unit: "cup", description: "shredded Cheddar cheese" })).toBe(false);
  });
});
