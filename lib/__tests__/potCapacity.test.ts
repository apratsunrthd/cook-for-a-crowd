import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { correctPotSizeForBulkIngredient } from "../potCapacity";

describe("correctPotSizeForBulkIngredient", () => {
  it("corrects an oversized pot down to the smallest one that comfortably fits", () => {
    const ingredients = [parseIngredientLine("10 cups long-grain white rice")];
    const corrected = correctPotSizeForBulkIngredient(ingredients, { shape: "pot", quartsCapacity: 32 });
    // 10 cups / 1.1 cups-per-quart ~= 9.1 quarts needed -> smallest standard size is 12.
    expect(corrected).toEqual({ shape: "pot", quartsCapacity: 12 });
  });

  it("corrects an undersized pot up to one that actually fits", () => {
    const ingredients = [parseIngredientLine("10 cups long-grain white rice")];
    const corrected = correctPotSizeForBulkIngredient(ingredients, { shape: "pot", quartsCapacity: 2 });
    expect(corrected).toEqual({ shape: "pot", quartsCapacity: 12 });
  });

  it("leaves an already-correct pot size unchanged", () => {
    const ingredients = [parseIngredientLine("2 cups long-grain white rice")];
    const corrected = correctPotSizeForBulkIngredient(ingredients, { shape: "pot", quartsCapacity: 2 });
    expect(corrected).toEqual({ shape: "pot", quartsCapacity: 2 });
  });

  it("falls back to the largest standard size when the quantity exceeds all of them", () => {
    const ingredients = [parseIngredientLine("100 cups long-grain white rice")];
    const corrected = correctPotSizeForBulkIngredient(ingredients, { shape: "pot", quartsCapacity: 2 });
    expect(corrected).toEqual({ shape: "pot", quartsCapacity: 32 });
  });

  it("leaves non-pot vessels (baking pans) unchanged", () => {
    const size = { shape: "rectangle" as const, widthIn: 9, heightIn: 13 };
    expect(correctPotSizeForBulkIngredient([parseIngredientLine("2 cups rice")], size)).toEqual(size);
  });

  it("leaves a null pan size unchanged", () => {
    expect(correctPotSizeForBulkIngredient([parseIngredientLine("2 cups rice")], null)).toBeNull();
  });

  it("leaves the pot size unchanged when no recognized bulk ingredient is present", () => {
    const ingredients = [parseIngredientLine("2 lbs ground beef"), parseIngredientLine("1 onion, diced")];
    const size = { shape: "pot" as const, quartsCapacity: 20 };
    expect(correctPotSizeForBulkIngredient(ingredients, size)).toEqual(size);
  });
});
