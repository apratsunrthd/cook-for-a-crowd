import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { densityGramsPerCup, estimateGramsAtRawQuantity, formatGrams } from "../ingredientWeight";

function grams(raw: string): number | null {
  return estimateGramsAtRawQuantity(parseIngredientLine(raw));
}

describe("estimateGramsAtRawQuantity", () => {
  it("converts weight units exactly, no density needed", () => {
    expect(grams("1 pound ground beef")).toBeCloseTo(453.592, 1);
    expect(grams("15 oz canned black beans")).toBeCloseTo(15 * 28.3495, 1);
    expect(grams("500 g flour")).toBeCloseTo(500, 1);
    expect(grams("1 kg sugar")).toBeCloseTo(1000, 1);
  });

  it("estimates volume-based ingredients using a density table", () => {
    expect(grams("2 cups all-purpose flour")).toBeCloseTo(240, 1);
    expect(grams("1 cup granulated sugar")).toBeCloseTo(200, 1);
    expect(grams("1/2 cup butter, melted")).toBeCloseTo(113.5, 1);
    expect(grams("1 teaspoon poppy seeds")).toBeGreaterThan(0);
  });

  it("matches more specific density entries before generic ones", () => {
    const brownSugarGrams = grams("1 cup brown sugar");
    const whiteSugarGrams = grams("1 cup granulated sugar");
    expect(brownSugarGrams).not.toBeCloseTo(whiteSugarGrams!, 1);
    expect(brownSugarGrams).toBeCloseTo(213, 1);
  });

  it("returns null for count-based ingredients with no unit", () => {
    expect(grams("3 large eggs")).toBeNull();
    expect(grams("2 cloves garlic, minced")).toBeNull();
  });

  it("returns null for volume units with no known density (e.g. crushed crackers)", () => {
    expect(grams("1 sleeve buttery round crackers, crushed")).toBeNull();
  });

  it("returns null for needs-review lines with no parsed quantity", () => {
    expect(grams("Salt to taste")).toBeNull();
  });
});

describe("densityGramsPerCup for canned vegetables/beans", () => {
  it("does not let a composite word fall through to a shorter, wrong substring match", () => {
    // "chickpea" contains "pea" and "chicken bean" isn't a thing, but this
    // must hit the bean entry (175), not the plain peas entry (160).
    expect(densityGramsPerCup("chickpeas, drained")).toBe(175);
    expect(densityGramsPerCup("canned green peas")).toBe(160);
  });

  it("does not mistake peanuts/peanut butter for peas", () => {
    expect(densityGramsPerCup("chopped peanuts")).toBeNull();
    expect(densityGramsPerCup("peanut butter")).toBe(258);
  });

  it("recognizes common canned vegetables", () => {
    expect(densityGramsPerCup("green beans, drained")).toBe(125);
    expect(densityGramsPerCup("sweet corn, drained")).toBe(165);
    expect(densityGramsPerCup("diced tomatoes")).toBe(245);
  });
});

describe("formatGrams", () => {
  it("formats under 1000g in grams", () => {
    expect(formatGrams(487)).toBe("487 g");
  });

  it("formats 1000g and above in kg", () => {
    expect(formatGrams(1200)).toBe("1.20 kg");
  });

  it("rounds grams to the nearest whole number", () => {
    expect(formatGrams(113.5)).toBe("114 g");
  });
});
