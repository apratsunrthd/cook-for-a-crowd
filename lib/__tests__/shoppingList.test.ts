import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../ingredientParser";
import { scaleIngredient } from "../scale";
import { aggregateIngredients, formatShoppingListItem } from "../shoppingList";

function scaled(raw: string, factor = 1) {
  return scaleIngredient(parseIngredientLine(raw), factor);
}

describe("aggregateIngredients", () => {
  it("merges the same ingredient across two recipes", () => {
    const items = aggregateIngredients([
      { recipeName: "Chili", ingredients: [scaled("2 cups onion, diced")] },
      { recipeName: "Salsa", ingredients: [scaled("1 cup onion, diced")] },
    ]);
    const onion = items.find((i) => i.description.toLowerCase().includes("onion"));
    expect(onion).toBeDefined();
    expect(onion?.quantity).toBe(3);
    expect(onion?.sources).toEqual(["Chili", "Salsa"]);
  });

  it("sums gram weights across merged items", () => {
    const items = aggregateIngredients([
      { recipeName: "Chili", ingredients: [scaled("2 cups flour")] },
      { recipeName: "Gravy", ingredients: [scaled("1 cup flour")] },
    ]);
    const flour = items.find((i) => i.description.includes("flour"));
    expect(flour?.grams).toBeCloseTo(360, 1); // (2+1) cups * 120 g/cup
  });

  it("leaves grams null when neither contributor has a known weight", () => {
    const items = aggregateIngredients([
      { recipeName: "A", ingredients: [scaled("2 cloves garlic, minced")] },
      { recipeName: "B", ingredients: [scaled("1 clove garlic, minced")] },
    ]);
    const garlic = items.find((i) => i.description.includes("garlic"));
    expect(garlic?.grams).toBeNull();
  });

  it("merges the same base ingredient even when the prep clause differs", () => {
    const items = aggregateIngredients([
      { recipeName: "Chili", ingredients: [scaled("1 onion, diced")] },
      { recipeName: "Soup", ingredients: [scaled("1 onion, sliced")] },
    ]);
    const onions = items.filter((i) => i.description.toLowerCase().includes("onion"));
    expect(onions).toHaveLength(1);
    expect(onions[0].quantity).toBe(2);
  });

  it("does not merge ingredients with different units", () => {
    const items = aggregateIngredients([
      { recipeName: "A", ingredients: [scaled("1 cup milk")] },
      { recipeName: "B", ingredients: [scaled("1 tbsp milk")] },
    ]);
    const milkItems = items.filter((i) => i.description.toLowerCase().includes("milk"));
    expect(milkItems).toHaveLength(2);
  });

  it("does not merge unrelated ingredients", () => {
    const items = aggregateIngredients([
      { recipeName: "A", ingredients: [scaled("1 cup flour")] },
      { recipeName: "B", ingredients: [scaled("1 cup sugar")] },
    ]);
    expect(items).toHaveLength(2);
  });

  it("averages a range's bounds for the aggregation value", () => {
    const items = aggregateIngredients([
      { recipeName: "A", ingredients: [scaled("2-4 tablespoons olive oil")] },
    ]);
    expect(items[0].quantity).toBe(3);
  });

  it("lists needs-review ingredients separately instead of merging them", () => {
    const items = aggregateIngredients([
      { recipeName: "A", ingredients: [scaled("Salt to taste")] },
      { recipeName: "B", ingredients: [scaled("Salt to taste")] },
    ]);
    const reviewItems = items.filter((i) => i.needsReview);
    expect(reviewItems).toHaveLength(2);
    expect(reviewItems[0].quantity).toBeNull();
  });

  it("tracks every recipe that contributes to a merged item", () => {
    const items = aggregateIngredients([
      { recipeName: "Chili", ingredients: [scaled("1 cup onion, diced")] },
      { recipeName: "Salsa", ingredients: [scaled("1 cup onion, diced")] },
      { recipeName: "Soup", ingredients: [scaled("1 cup onion, diced")] },
    ]);
    expect(items[0].sources).toEqual(["Chili", "Salsa", "Soup"]);
  });
});

describe("formatShoppingListItem", () => {
  it("formats a merged item, pluralizing the unit", () => {
    const items = aggregateIngredients([
      { recipeName: "A", ingredients: [scaled("2 cups flour")] },
    ]);
    expect(formatShoppingListItem(items[0])).toBe("2 cups flour (240 g / 8.5 oz)");
  });

  it("formats a needs-review item using its raw description", () => {
    const items = aggregateIngredients([{ recipeName: "A", ingredients: [scaled("Salt to taste")] }]);
    expect(formatShoppingListItem(items[0])).toBe("Salt to taste");
  });

  it("keeps a per-can size annotation in its leading position, and the weight it implies", () => {
    const items = aggregateIngredients([
      { recipeName: "Green Beans", ingredients: [scaled("10 (14.5 oz) cans green beans, drained")] },
    ]);
    expect(formatShoppingListItem(items[0])).toBe("10 (14.5 oz) cans green beans, drained (4.11 kg / 9 lb 1 oz)");
  });
});
