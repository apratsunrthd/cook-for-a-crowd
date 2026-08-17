import { describe, expect, it, vi } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { fillMissingGrams } from "../ingredientWeightAI";

describe("fillMissingGrams", () => {
  it("only sends ingredients the deterministic pass couldn't resolve, and writes results back to the right positions", async () => {
    const ingredients = [
      parseIngredientLine("2 cups flour"), // resolved deterministically, should NOT be sent to AI
      parseIngredientLine("3 large eggs"), // gap
      parseIngredientLine("2 cloves garlic, minced"), // gap
    ];
    expect(ingredients[0].gramsAtRawQuantity).not.toBeNull();
    expect(ingredients[1].gramsAtRawQuantity).toBeNull();
    expect(ingredients[2].gramsAtRawQuantity).toBeNull();

    const estimate = vi.fn().mockResolvedValue(
      new Map([
        [0, 150], // "3 large eggs" -> 150g
        [1, 6], // "2 cloves garlic, minced" -> 6g
      ]),
    );

    const result = await fillMissingGrams(ingredients, estimate);

    expect(estimate).toHaveBeenCalledWith(["3 large eggs", "2 cloves garlic, minced"]);
    expect(result[0].gramsAtRawQuantity).toBe(ingredients[0].gramsAtRawQuantity); // untouched
    expect(result[1].gramsAtRawQuantity).toBe(150);
    expect(result[2].gramsAtRawQuantity).toBe(6);
  });

  it("is a no-op when nothing needs filling", async () => {
    const ingredients = [parseIngredientLine("2 cups flour")];
    const estimate = vi.fn();
    const result = await fillMissingGrams(ingredients, estimate);
    expect(estimate).not.toHaveBeenCalled();
    expect(result).toBe(ingredients);
  });

  it("leaves gaps unresolved when the estimate omits them", async () => {
    const ingredients = [parseIngredientLine("Salt to taste")];
    const estimate = vi.fn().mockResolvedValue(new Map());
    const result = await fillMissingGrams(ingredients, estimate);
    expect(result[0].gramsAtRawQuantity).toBeNull();
  });
});
