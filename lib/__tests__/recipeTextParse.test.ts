import { describe, expect, it } from "vitest";
import { parseRecipeFromPlainText } from "../recipeTextParse";

describe("parseRecipeFromPlainText", () => {
  it("parses a typical copy-pasted recipe with Ingredients/Instructions headings", () => {
    const text = `
      Weeknight Chili
      Serves 8

      Ingredients
      2 tablespoons olive oil
      1 onion, diced
      2 pounds ground beef
      1 (28 oz) can crushed tomatoes

      Instructions
      Heat oil in a large pot.
      Add onion and cook until soft.
      Add beef and brown.
      Stir in tomatoes and simmer.

      Nutrition
      350 calories per serving
    `;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.name).toBe("Weeknight Chili");
    expect(draft.servings).toBe(8);
    expect(draft.ingredients).toHaveLength(4);
    expect(draft.ingredients[0].quantity).toBe(2);
    expect(draft.instructions).toContain("Heat oil");
    expect(draft.instructions).not.toContain("calories");
  });

  it("handles 'Directions' as an alternate instructions heading", () => {
    const text = `Pancakes\nIngredients\n2 cups flour\n1 cup milk\nDirections\nMix and cook.`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.ingredients).toHaveLength(2);
    expect(draft.instructions).toBe("Mix and cook.");
  });

  it("stops the ingredients section at the next heading even without an instructions section", () => {
    const text = `Snack Mix\nIngredients\n1 cup pretzels\n1 cup nuts\nNotes\nStore in an airtight container.`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.ingredients).toHaveLength(2);
    expect(draft.instructions).toBeNull();
  });

  it("extracts a yield hint from anywhere in the text", () => {
    const text = `Big Batch Soup\nMakes 12 servings\nIngredients\n1 lb carrots`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.servings).toBe(12);
  });

  it("falls back to treating every line as a candidate ingredient when no heading is found", () => {
    const text = `Grandma's Cornbread\n1 cup cornmeal\n1 cup flour\nBake at 400F for 20 minutes.`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.name).toBe("Grandma's Cornbread");
    expect(draft.ingredients.length).toBeGreaterThan(0);
    expect(draft.ingredients[0].quantity).toBe(1);
  });

  it("does not throw on empty input", () => {
    expect(() => parseRecipeFromPlainText("")).not.toThrow();
  });
});
