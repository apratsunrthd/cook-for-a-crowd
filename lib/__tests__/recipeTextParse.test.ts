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

  it("picks up a pan size mentioned in the instructions", () => {
    const text = `Poppy Seed Chicken Casserole\nServes 8\nIngredients\n3 cups cooked shredded chicken\nInstructions\nMix chicken, soup, and sour cream in a 9x13 pan.\nTop with crackers and bake at 350F.`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.panSize).toEqual({ shape: "rectangle", widthIn: 9, heightIn: 13 });
  });

  it("leaves pan size null when nothing mentions one", () => {
    const text = `Chili\nIngredients\n2 lbs ground beef\nInstructions\nSimmer for an hour.`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.panSize).toBeNull();
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

  it("regression: real-world AllRecipes-style paste with a single-dimension square pan", () => {
    // Exact text a user pasted that previously failed pan-size detection --
    // "9-inch square baking dish" has one dimension, not "WxH".
    const text = `Poppy Seed Chicken Casserole
This poppy seed chicken casserole is very simple to make with shredded chicken and an easy creamy sauce. You can use leftover cooked chicken if you have it.

Submitted by Callie Wilson Wolfe
Prep Time: 20 mins
Cook Time: 50 mins
Total Time: 1 hr 10 mins
Servings: 6
Yield: 1 (9-inch) casserole
Ingredients
4 skinless, boneless chicken breast halves

1 sleeve buttery round crackers (such as Ritz), crushed

1/2 cup butter, melted

1 teaspoon poppy seeds, or more if desired

1 (10.5 ounce) can condensed cream of chicken soup

1 (8 ounce) container sour cream

2 cups shredded Cheddar cheese

Directions
Gather all ingredients.

Place chicken breasts into a large pot; cover with water and bring to a boil over high heat. Reduce heat to medium, cover, and simmer until chicken is no longer pink in the center, about 20 minutes. Drain; shred chicken with two forks.

Preheat the oven to 350 degrees F (175 degrees C). Mix crackers, melted butter, and poppy seeds together in a large bowl until combined; set aside.

Stir condensed soup and sour cream together in a medium bowl; pour 1/2 of the mixture into a 9-inch square baking dish.

Add shredded chicken in an even layer.

Top with remaining soup mixture. Sprinkle with Cheddar cheese.

Top with cracker mixture.

Bake in the preheated oven until cheese has melted and the sauce is bubbly, 25 to 30 minutes.

Cook's Note
You can use about 4 cups shredded leftover or rotisserie chicken to save time.`;
    const draft = parseRecipeFromPlainText(text);
    expect(draft.panSize).toEqual({ shape: "rectangle", widthIn: 9, heightIn: 9 });
    expect(draft.ingredients.length).toBeGreaterThanOrEqual(6);
  });
});
