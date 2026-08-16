import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RecipeImportError, parseRecipeFromHtml } from "../recipeImport";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

describe("parseRecipeFromHtml", () => {
  it("extracts a Recipe wrapped in an @graph array", () => {
    const html = loadFixture("graph-wrapped.html");
    const draft = parseRecipeFromHtml(html, "https://example-food-site.com/weeknight-chili");
    expect(draft.name).toBe("Weeknight Chili");
    expect(draft.servings).toBe(8);
    expect(draft.rawYieldText).toBe("8 servings");
    expect(draft.ingredients).toHaveLength(9);
    expect(draft.ingredients[0].quantity).toBe(2);
    expect(draft.imageUrl).toBe("https://example-food-site.com/images/chili.jpg");
    expect(draft.instructions).toContain("Heat oil");
  });

  it("extracts a plain (non-@graph) Recipe node", () => {
    const html = loadFixture("plain-recipe.html");
    const draft = parseRecipeFromHtml(html, "https://example-food-site.com/pancakes");
    expect(draft.name).toBe("Classic Buttermilk Pancakes");
    expect(draft.servings).toBe(4);
    expect(draft.ingredients).toHaveLength(8);
    expect(draft.imageUrl).toBe("https://example-food-site.com/images/pancakes.jpg");
  });

  it("handles recipeYield given as an array of alternate representations", () => {
    const html = loadFixture("yield-variants.html");
    const draft = parseRecipeFromHtml(html, "https://example-food-site.com/potato-salad");
    expect(draft.servings).toBe(12);
    expect(draft.ingredients.length).toBeGreaterThan(0);
  });

  it("flags ingredient lines with no leading quantity for review", () => {
    const html = loadFixture("yield-variants.html");
    const draft = parseRecipeFromHtml(html, "https://example-food-site.com/potato-salad");
    const saltLine = draft.ingredients.find((i) => i.raw.toLowerCase().includes("salt and pepper"));
    expect(saltLine?.needsReview).toBe(true);
  });

  it("throws RecipeImportError when the page has JSON-LD but no Recipe type", () => {
    const html = loadFixture("no-recipe.html");
    expect(() => parseRecipeFromHtml(html, "https://example-food-site.com/tips")).toThrow(
      RecipeImportError,
    );
  });

  it("throws RecipeImportError when the page has no JSON-LD at all", () => {
    const html = loadFixture("no-jsonld.html");
    expect(() => parseRecipeFromHtml(html, "https://example-food-site.com/cornbread")).toThrow(
      RecipeImportError,
    );
  });

  it("tolerates malformed JSON-LD elsewhere on the page and still finds the recipe", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ not valid json </script>
        ${loadFixture("plain-recipe.html").match(/<script[^>]*>[\s\S]*?<\/script>/)?.[0] ?? ""}
      </head></html>
    `;
    const draft = parseRecipeFromHtml(html, "https://example-food-site.com/pancakes");
    expect(draft.name).toBe("Classic Buttermilk Pancakes");
  });
});
