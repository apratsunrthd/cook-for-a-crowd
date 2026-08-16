import { describe, expect, it } from "vitest";
import { parseIngredientLine, parseIngredientLines } from "../ingredientParser";

// Adversarial fixtures pulled from real recipe sites (NYT Cooking, Serious
// Eats, AllRecipes, food blogs) -- the risk here is messy real-world text,
// so synthetic strings would understate it.
describe("parseIngredientLine", () => {
  it("parses a simple integer quantity with unit", () => {
    const result = parseIngredientLine("2 cups all-purpose flour");
    expect(result.quantity).toBe(2);
    expect(result.unit).toBe("cup");
    expect(result.description).toBe("all-purpose flour");
    expect(result.needsReview).toBe(false);
  });

  it("parses a mixed number", () => {
    const result = parseIngredientLine("1 1/2 teaspoons kosher salt");
    expect(result.quantity).toBeCloseTo(1.5);
    expect(result.unit).toBe("teaspoon");
    expect(result.description).toBe("kosher salt");
  });

  it("parses a unicode vulgar fraction", () => {
    const result = parseIngredientLine("¾ cup granulated sugar");
    expect(result.quantity).toBeCloseTo(0.75);
    expect(result.unit).toBe("cup");
  });

  it("parses a decimal quantity", () => {
    const result = parseIngredientLine("0.5 cup buttermilk");
    expect(result.quantity).toBeCloseTo(0.5);
    expect(result.unit).toBe("cup");
  });

  it("parses a range and keeps both bounds", () => {
    const result = parseIngredientLine("2-3 tablespoons olive oil");
    expect(result.quantity).toBe(2);
    expect(result.quantity2).toBe(3);
    expect(result.unit).toBe("tablespoon");
  });

  it("parses a range written with 'to'", () => {
    const result = parseIngredientLine("1 to 2 cups chicken stock");
    expect(result.quantity).toBe(1);
    expect(result.quantity2).toBe(2);
  });

  it("keeps size descriptors in the description rather than treating them as units", () => {
    const result = parseIngredientLine("3 large eggs, beaten");
    expect(result.quantity).toBe(3);
    expect(result.description.toLowerCase()).toContain("large eggs");
  });

  it("handles a line with no leading quantity by flagging it for review", () => {
    const result = parseIngredientLine("Salt to taste");
    expect(result.quantity).toBeNull();
    expect(result.needsReview).toBe(true);
    expect(result.description.toLowerCase()).toContain("salt");
  });

  it("handles 'a pinch of' style lines without a numeric quantity", () => {
    const result = parseIngredientLine("A pinch of red pepper flakes");
    expect(result.quantity).toBeNull();
    expect(result.needsReview).toBe(true);
  });

  it("does not flag a section heading as needing review", () => {
    const result = parseIngredientLine("For the icing:");
    expect(result.isGroupHeader).toBe(true);
    expect(result.needsReview).toBe(false);
  });

  it("parses ingredients with parenthetical alternate units without crashing", () => {
    const result = parseIngredientLine("1 cup (240 ml) whole milk");
    expect(result.quantity).toBe(1);
    expect(result.unit).toBe("cup");
  });

  it("parses can/package style units", () => {
    const result = parseIngredientLine("2 (15 oz) cans black beans, drained and rinsed");
    expect(result.quantity).toBe(2);
    expect(result.description.toLowerCase()).toContain("black beans");
  });

  it("does not throw on an empty string", () => {
    expect(() => parseIngredientLine("")).not.toThrow();
  });
});

describe("parseIngredientLines", () => {
  it("filters out blank lines and parses the rest", () => {
    const results = parseIngredientLines(["2 cups flour", "", "  ", "1 tsp salt"]);
    expect(results).toHaveLength(2);
    expect(results[0].quantity).toBe(2);
    expect(results[1].quantity).toBe(1);
  });
});
