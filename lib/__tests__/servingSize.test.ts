import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { scaleIngredient } from "../scale";
import {
  estimatePortionCups,
  estimatePortionOz,
  formatPortionCups,
  formatPortionOz,
  totalDishGrams,
  totalDishVolumeMl,
} from "../servingSize";
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
    expect(totalDishGrams([scaled("3 eggs"), scaled("2 cloves garlic, minced")])).toBeNull();
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

describe("totalDishVolumeMl", () => {
  it("converts a volume-unit ingredient directly, no density needed", () => {
    // 1 cup = 236.588 ml.
    expect(totalDishVolumeMl([scaled("1 cup water")])).toBeCloseTo(236.588, 0);
  });

  it("falls back to weight/density for a count-based line with no volume unit", () => {
    // 10 cans x 14.5 oz = 145 oz = ~4110.7g green beans; at 125 g/cup that's ~32.9 cups.
    const ml = totalDishVolumeMl([scaled("10 (14.5 oz) cans green beans, drained")]);
    expect(ml).not.toBeNull();
    expect(ml! / 236.588).toBeCloseTo(32.9, 0);
  });

  it("returns null when nothing in the dish could be sized by volume", () => {
    expect(totalDishVolumeMl([scaled("3 eggs"), scaled("2 chicken breasts")])).toBeNull();
  });
});

describe("estimatePortionCups", () => {
  it("divides the dish's total volume across the headcount", () => {
    const dish = [scaled("2 cups flour")];
    expect(estimatePortionCups(dish, 4)).toBeCloseTo(0.5, 2);
  });

  it("estimates a sensible per-person cup amount for a canned-vegetable side", () => {
    // ~32.9 cups total across 57 people -> ~0.58 cups/person, a plausible side-dish portion.
    const dish = [scaled("10 (14.5 oz) cans green beans, drained")];
    const cups = estimatePortionCups(dish, 57);
    expect(cups).not.toBeNull();
    expect(cups!).toBeGreaterThan(0.4);
    expect(cups!).toBeLessThan(0.8);
  });
});

describe("formatPortionCups", () => {
  it("snaps to the nearest common cooking fraction", () => {
    expect(formatPortionCups(0.5)).toBe("1/2 cup");
    expect(formatPortionCups(1)).toBe("1 cup");
    expect(formatPortionCups(1.25)).toBe("1 1/4 cups");
  });

  it("returns null rather than '0 cups' for a negligible amount", () => {
    expect(formatPortionCups(0.02)).toBeNull();
  });
});
