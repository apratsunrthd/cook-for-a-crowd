import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import {
  InvalidServingsError,
  batchesNeeded,
  effectiveHeadcount,
  formatScaledIngredient,
  roundUpToWholeBatches,
  scaleFactor,
  scaleIngredient,
  scaleRecipe,
} from "../scale";
import type { Recipe } from "../types";

describe("effectiveHeadcount", () => {
  it("applies a percentage buffer, rounding up", () => {
    expect(
      effectiveHeadcount({ rsvpCount: 40, bufferMode: "percentage", bufferValue: 20 }),
    ).toBe(48);
  });

  it("applies a flat buffer, rounding up", () => {
    expect(effectiveHeadcount({ rsvpCount: 40, bufferMode: "flat", bufferValue: 10 })).toBe(50);
  });

  it("rounds up fractional percentage results so nobody goes hungry", () => {
    expect(
      effectiveHeadcount({ rsvpCount: 33, bufferMode: "percentage", bufferValue: 10 }),
    ).toBe(37); // 36.3 -> 37
  });

  it("handles a zero buffer", () => {
    expect(effectiveHeadcount({ rsvpCount: 25, bufferMode: "flat", bufferValue: 0 })).toBe(25);
  });
});

describe("batchesNeeded", () => {
  it("rounds up rather than leaving people short", () => {
    // 57 people, 6 per pan -> 9 pans only covers 54; must be 10.
    expect(batchesNeeded(57, 6)).toBe(10);
  });

  it("returns exactly the ratio when it divides evenly", () => {
    expect(batchesNeeded(48, 8)).toBe(6);
  });

  it("always needs at least 1 batch", () => {
    expect(batchesNeeded(3, 8)).toBe(1);
  });

  it("falls back to 1 when servings-per-batch is null or invalid", () => {
    expect(batchesNeeded(57, null)).toBe(1);
    expect(batchesNeeded(57, 0)).toBe(1);
  });
});

describe("roundUpToWholeBatches", () => {
  it("returns the headcount actually covered by whole batches", () => {
    expect(roundUpToWholeBatches(57, 6)).toBe(60); // 10 batches x 6
  });

  it("matches the target exactly when it divides evenly", () => {
    expect(roundUpToWholeBatches(48, 8)).toBe(48);
  });

  it("returns the target unchanged when servings-per-batch is null or invalid", () => {
    expect(roundUpToWholeBatches(57, null)).toBe(57);
    expect(roundUpToWholeBatches(57, 0)).toBe(57);
  });
});

describe("scaleFactor", () => {
  it("computes the ratio of target headcount to native servings", () => {
    expect(scaleFactor({ name: "Chili", servings: 8 }, 40)).toBe(5);
  });

  it("throws InvalidServingsError for a zero servings recipe", () => {
    expect(() => scaleFactor({ name: "Chili", servings: 0 }, 40)).toThrow(InvalidServingsError);
  });

  it("throws InvalidServingsError for a null servings recipe", () => {
    expect(() => scaleFactor({ name: "Chili", servings: null }, 40)).toThrow(
      InvalidServingsError,
    );
  });

  it("throws InvalidServingsError for a negative servings recipe", () => {
    expect(() => scaleFactor({ name: "Chili", servings: -2 }, 40)).toThrow(InvalidServingsError);
  });
});

describe("scaleIngredient", () => {
  it("multiplies quantity by the factor", () => {
    const ingredient = parseIngredientLine("2 cups flour");
    const scaled = scaleIngredient(ingredient, 2.5);
    expect(scaled.quantity).toBe(5);
    expect(scaled.unit).toBe("cup");
  });

  it("scales both bounds of a range", () => {
    const ingredient = parseIngredientLine("2-3 tablespoons olive oil");
    const scaled = scaleIngredient(ingredient, 2);
    expect(scaled.quantity).toBe(4);
    expect(scaled.quantity2).toBe(6);
  });

  it("leaves a needs-review ingredient's null quantity alone", () => {
    const ingredient = parseIngredientLine("Salt to taste");
    const scaled = scaleIngredient(ingredient, 3);
    expect(scaled.quantity).toBeNull();
    expect(scaled.needsReview).toBe(true);
  });
});

describe("scaleRecipe", () => {
  function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
    return {
      id: 1,
      name: "Test Recipe",
      sourceUrl: null,
      servings: 4,
      rawYieldText: "4 servings",
      ingredients: [parseIngredientLine("2 cups flour"), parseIngredientLine("1 tsp salt")],
      instructions: null,
      imageUrl: null,
      panSize: null,
      createdAt: "",
      updatedAt: "",
      ...overrides,
    };
  }

  it.each([1.5, 2, 0.5])("scales every ingredient by the same factor (%sx)", (multiplier) => {
    const recipe = makeRecipe({ servings: 4 });
    const scaled = scaleRecipe(recipe, 4 * multiplier);
    expect(scaled[0].quantity).toBeCloseTo(2 * multiplier);
    expect(scaled[1].quantity).toBeCloseTo(1 * multiplier);
  });

  it("handles an awkward scale factor (37/8 servings) without throwing", () => {
    const recipe = makeRecipe({ servings: 8 });
    const scaled = scaleRecipe(recipe, 37);
    expect(scaled[0].quantity).toBeCloseTo(2 * (37 / 8));
  });
});

describe("formatScaledIngredient", () => {
  it("formats a plain scaled ingredient, pluralizing the unit", () => {
    const scaled = scaleIngredient(parseIngredientLine("2 cups flour"), 1.5);
    expect(formatScaledIngredient(scaled)).toBe("3 cups flour");
  });

  it("formats a scaled range, pluralizing the unit", () => {
    const scaled = scaleIngredient(parseIngredientLine("2-3 tablespoons olive oil"), 2);
    expect(formatScaledIngredient(scaled)).toBe("4-6 tablespoons olive oil");
  });

  it("uses the singular unit when the scaled quantity is exactly 1", () => {
    const scaled = scaleIngredient(parseIngredientLine("2 cups flour"), 0.5);
    expect(formatScaledIngredient(scaled)).toBe("1 cup flour");
  });

  it("falls back to the raw line for needs-review ingredients", () => {
    const scaled = scaleIngredient(parseIngredientLine("Salt to taste"), 3);
    expect(formatScaledIngredient(scaled)).toBe("Salt to taste");
  });
});
