import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { scaleIngredient } from "../scale";
import { estimatePortionOz, formatPortionOz, totalDishGrams } from "../servingSize";
import type { ScaledIngredient } from "../types";

function scaled(raw: string, factor = 1): ScaledIngredient {
  return scaleIngredient(parseIngredientLine(raw), factor);
}

describe("totalDishGrams", () => {
  it("sums only the ingredients with a known weight", () => {
    const dish = [scaled("2 cups flour"), scaled("1 cup sugar"), scaled("3 eggs")];
    // 2 cups flour (240g) + 1 cup sugar (200g); eggs have no known weight.
    expect(totalDishGrams(dish)).toBeCloseTo(440, 0);
  });

  it("returns null when nothing in the dish could be weighed", () => {
    expect(totalDishGrams([scaled("3 eggs"), scaled("2 chicken breasts")])).toBeNull();
  });
});

describe("estimatePortionOz", () => {
  it("divides the dish's total weight across the headcount", () => {
    const dish = [scaled("10 (14.5 oz) cans green beans, drained")];
    // 10 * 14.5 oz = 145 oz total, feeding 29 people -> 5 oz/person.
    expect(estimatePortionOz(dish, 29)).toBeCloseTo(5, 1);
  });

  it("returns null for a zero or negative headcount", () => {
    const dish = [scaled("2 cups flour")];
    expect(estimatePortionOz(dish, 0)).toBeNull();
    expect(estimatePortionOz(dish, -3)).toBeNull();
  });

  it("returns null when the dish has no weighable ingredients", () => {
    expect(estimatePortionOz([scaled("3 eggs")], 6)).toBeNull();
  });
});

describe("formatPortionOz", () => {
  it("snaps to the nearest half ounce", () => {
    expect(formatPortionOz(4.05)).toBe("4 oz");
    expect(formatPortionOz(4.3)).toBe("4 1/2 oz");
    expect(formatPortionOz(4.8)).toBe("5 oz");
  });
});
