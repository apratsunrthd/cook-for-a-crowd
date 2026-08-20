import { describe, expect, it, vi } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { fillMissingIngredientDetails, type IngredientEstimate } from "../ingredientWeightAI";

describe("fillMissingIngredientDetails", () => {
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
      new Map<number, IngredientEstimate>([
        [0, { grams: 150, wholeItem: true }], // "3 large eggs"
        [1, { grams: 6, wholeItem: null }], // "2 cloves garlic, minced"
      ]),
    );

    const result = await fillMissingIngredientDetails(ingredients, estimate);

    expect(estimate).toHaveBeenCalledWith(["3 large eggs", "2 cloves garlic, minced"]);
    expect(result[0].gramsAtRawQuantity).toBe(ingredients[0].gramsAtRawQuantity); // untouched
    expect(result[1].gramsAtRawQuantity).toBe(150);
    expect(result[1].roundsToWhole).toBe(true);
    expect(result[2].gramsAtRawQuantity).toBe(6);
  });

  it("never overwrites roundsToWhole for a line that already has a real unit, even if the AI disagrees", async () => {
    const ingredients = [parseIngredientLine("2 cloves garlic, minced")];
    expect(ingredients[0].unit).toBe("clove");
    expect(ingredients[0].roundsToWhole).toBe(false);

    const estimate = vi.fn().mockResolvedValue(new Map<number, IngredientEstimate>([[0, { grams: 6, wholeItem: true }]]));
    const result = await fillMissingIngredientDetails(ingredients, estimate);

    expect(result[0].gramsAtRawQuantity).toBe(6);
    expect(result[0].roundsToWhole).toBe(false);
  });

  it("is a no-op when nothing needs filling", async () => {
    const ingredients = [parseIngredientLine("2 cups flour")];
    const estimate = vi.fn();
    const result = await fillMissingIngredientDetails(ingredients, estimate);
    expect(estimate).not.toHaveBeenCalled();
    expect(result).toBe(ingredients);
  });

  it("leaves gaps unresolved when the estimate omits them", async () => {
    const ingredients = [parseIngredientLine("Salt to taste")];
    const estimate = vi.fn().mockResolvedValue(new Map());
    const result = await fillMissingIngredientDetails(ingredients, estimate);
    expect(result[0].gramsAtRawQuantity).toBeNull();
  });
});
