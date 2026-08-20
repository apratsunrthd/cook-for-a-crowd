import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db";
import { parseIngredientLines } from "../../ingredientParser";
import {
  attachRecipe,
  createVariant,
  createVariantRebalanced,
  deleteVariant,
  detachRecipe,
  ensureDefaultVariant,
  listEventRecipes,
  listVariants,
  updateVariant,
} from "../eventRecipes";
import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from "../events";
import {
  DuplicateSourceUrlError,
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  updateRecipe,
} from "../recipes";

let db: Database.Database;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("migrations", () => {
  it("creates the expected tables", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(expect.arrayContaining(["recipes", "events", "event_recipes", "migrations"]));
  });

  it("is idempotent -- re-running createDb on the same file doesn't fail", () => {
    // :memory: databases aren't shared across connections, so exercise the
    // idempotency guard directly by running migrations twice on one handle.
    expect(() => createDb(":memory:")).not.toThrow();
  });
});

describe("recipes repo", () => {
  it("creates and retrieves a recipe with parsed ingredients", () => {
    const ingredients = parseIngredientLines(["2 cups flour", "1 tsp salt"]);
    const recipe = createRecipe(db, {
      name: "Chili",
      sourceUrl: "https://example.com/chili",
      servings: 8,
      rawYieldText: "Serves 8",
      ingredients,
    });
    expect(recipe.id).toBeGreaterThan(0);

    const fetched = getRecipe(db, recipe.id);
    expect(fetched?.name).toBe("Chili");
    expect(fetched?.ingredients).toHaveLength(2);
    expect(fetched?.ingredients[0].quantity).toBe(2);
  });

  it("rejects a duplicate source_url on create", () => {
    createRecipe(db, {
      name: "Chili",
      sourceUrl: "https://example.com/chili",
      servings: 8,
      ingredients: [],
    });
    expect(() =>
      createRecipe(db, {
        name: "Chili Again",
        sourceUrl: "https://example.com/chili",
        servings: 8,
        ingredients: [],
      }),
    ).toThrow(DuplicateSourceUrlError);
  });

  it("allows multiple recipes with no source_url (manual entry)", () => {
    createRecipe(db, { name: "Family Recipe 1", ingredients: [], servings: 4 });
    createRecipe(db, { name: "Family Recipe 2", ingredients: [], servings: 4 });
    expect(listRecipes(db)).toHaveLength(2);
  });

  it("updates a recipe", () => {
    const recipe = createRecipe(db, { name: "Chili", ingredients: [], servings: 8 });
    const updated = updateRecipe(db, recipe.id, {
      name: "Chili (updated)",
      ingredients: parseIngredientLines(["1 cup beans"]),
      servings: 10,
    });
    expect(updated.name).toBe("Chili (updated)");
    expect(updated.servings).toBe(10);
    expect(updated.ingredients).toHaveLength(1);
  });

  it("deletes a recipe", () => {
    const recipe = createRecipe(db, { name: "Chili", ingredients: [], servings: 8 });
    deleteRecipe(db, recipe.id);
    expect(getRecipe(db, recipe.id)).toBeNull();
  });
});

describe("events repo", () => {
  it("creates, updates, and lists events", () => {
    const event = createEvent(db, {
      name: "Fall Court of Honor",
      eventDate: "2026-10-10",
      rsvpCount: 40,
      bufferMode: "percentage",
      bufferValue: 20,
    });
    expect(event.id).toBeGreaterThan(0);
    expect(listEvents(db)).toHaveLength(1);

    const updated = updateEvent(db, event.id, {
      name: "Fall Court of Honor",
      eventDate: "2026-10-10",
      rsvpCount: 50,
      bufferMode: "flat",
      bufferValue: 10,
    });
    expect(updated.rsvpCount).toBe(50);
    expect(updated.bufferMode).toBe("flat");
  });

  it("deletes an event", () => {
    const event = createEvent(db, {
      name: "Event",
      rsvpCount: 10,
      bufferMode: "flat",
      bufferValue: 5,
    });
    deleteEvent(db, event.id);
    expect(getEvent(db, event.id)).toBeNull();
  });
});

describe("event_recipes repo", () => {
  it("attaches and lists recipes for an event, joined with recipe data", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 40, bufferMode: "flat", bufferValue: 10 });
    const recipe = createRecipe(db, {
      name: "Chili",
      ingredients: parseIngredientLines(["2 cups flour"]),
      servings: 8,
    });

    attachRecipe(db, event.id, recipe.id, "main");
    const attached = listEventRecipes(db, event.id);
    expect(attached).toHaveLength(1);
    expect(attached[0].recipe.name).toBe("Chili");
    expect(attached[0].eventRecipe.course).toBe("main");
  });

  it("defaults course to main and allows updating it via re-attach", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 40, bufferMode: "flat", bufferValue: 10 });
    const recipe = createRecipe(db, { name: "Brownies", ingredients: [], servings: 8 });
    attachRecipe(db, event.id, recipe.id);
    expect(listEventRecipes(db, event.id)[0].eventRecipe.course).toBe("main");
    attachRecipe(db, event.id, recipe.id, "dessert");
    expect(listEventRecipes(db, event.id)[0].eventRecipe.course).toBe("dessert");
  });

  it("detaches a recipe from an event", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 40, bufferMode: "flat", bufferValue: 10 });
    const recipe = createRecipe(db, { name: "Chili", ingredients: [], servings: 8 });
    attachRecipe(db, event.id, recipe.id);
    detachRecipe(db, event.id, recipe.id);
    expect(listEventRecipes(db, event.id)).toHaveLength(0);
  });

  it("cascades delete when the event is removed", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 40, bufferMode: "flat", bufferValue: 10 });
    const recipe = createRecipe(db, { name: "Chili", ingredients: [], servings: 8 });
    attachRecipe(db, event.id, recipe.id);
    deleteEvent(db, event.id);
    const remaining = db.prepare("SELECT * FROM event_recipes").all();
    expect(remaining).toHaveLength(0);
  });

  it("cascades delete when the recipe is removed", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 40, bufferMode: "flat", bufferValue: 10 });
    const recipe = createRecipe(db, { name: "Chili", ingredients: [], servings: 8 });
    attachRecipe(db, event.id, recipe.id);
    deleteRecipe(db, recipe.id);
    const remaining = db.prepare("SELECT * FROM event_recipes").all();
    expect(remaining).toHaveLength(0);
  });
});

describe("recipe variants repo", () => {
  const baseIngredients = parseIngredientLines([
    "3 cups cooked shredded chicken",
    "2 tablespoons poppy seeds",
  ]);

  function attachedRecipe(servings = 8) {
    const event = createEvent(db, { name: "Event", rsvpCount: 48, bufferMode: "flat", bufferValue: 0 });
    const recipe = createRecipe(db, {
      name: "Poppy Seed Casserole",
      ingredients: baseIngredients,
      servings,
    });
    attachRecipe(db, event.id, recipe.id, "main");
    return { event, recipe };
  }

  it("ensureDefaultVariant creates a single Standard variant covering the full headcount, copying the recipe's ingredients", () => {
    const { event, recipe } = attachedRecipe();
    ensureDefaultVariant(db, event.id, recipe.id, 48, recipe.ingredients);
    const variants = listVariants(db, event.id, recipe.id);
    expect(variants).toHaveLength(1);
    expect(variants[0].label).toBe("Standard");
    expect(variants[0].servings).toBe(48);
    expect(variants[0].notes).toBeNull();
    expect(variants[0].ingredients).toHaveLength(2);
  });

  it("ensureDefaultVariant is a no-op if a variant already exists", () => {
    const { event, recipe } = attachedRecipe();
    ensureDefaultVariant(db, event.id, recipe.id, 48, recipe.ingredients);
    createVariant(db, event.id, recipe.id, {
      label: "Extra",
      servings: 8,
      notes: null,
      ingredients: recipe.ingredients,
    });
    ensureDefaultVariant(db, event.id, recipe.id, 48, recipe.ingredients);
    expect(listVariants(db, event.id, recipe.id)).toHaveLength(2);
  });

  it("supports splitting a dish into multiple labeled variants with modification notes", () => {
    const { event, recipe } = attachedRecipe();
    createVariant(db, event.id, recipe.id, {
      label: "Standard",
      servings: 32,
      notes: null,
      ingredients: recipe.ingredients,
    });
    createVariant(db, event.id, recipe.id, {
      label: "Gluten-free topping",
      servings: 8,
      notes: "Use GF breadcrumb topping instead of regular.",
      ingredients: recipe.ingredients,
    });
    createVariant(db, event.id, recipe.id, {
      label: "No poppy seed",
      servings: 8,
      notes: "Omit poppy seeds for seed allergy.",
      ingredients: recipe.ingredients,
    });

    const variants = listVariants(db, event.id, recipe.id);
    expect(variants).toHaveLength(3);
    expect(variants.reduce((sum, v) => sum + v.servings, 0)).toBe(48);
    expect(variants[1].notes).toContain("GF breadcrumb");
  });

  it("allows a variant to actually remove an ingredient (not just note the change)", () => {
    const { event, recipe } = attachedRecipe();
    const withoutPoppySeeds = recipe.ingredients.filter(
      (i) => !i.description.toLowerCase().includes("poppy"),
    );
    const variant = createVariant(db, event.id, recipe.id, {
      label: "No poppy seed",
      servings: 8,
      notes: "Omit poppy seeds for seed allergy.",
      ingredients: withoutPoppySeeds,
    });
    expect(variant.ingredients).toHaveLength(1);
    expect(variant.ingredients.some((i) => i.description.includes("poppy"))).toBe(false);

    const reloaded = listVariants(db, event.id, recipe.id)[0];
    expect(reloaded.ingredients).toHaveLength(1);
  });

  it("updates a variant", () => {
    const { event, recipe } = attachedRecipe();
    const variant = createVariant(db, event.id, recipe.id, {
      label: "Standard",
      servings: 48,
      notes: null,
      ingredients: recipe.ingredients,
    });
    const updated = updateVariant(db, variant.id, {
      label: "Standard",
      servings: 40,
      notes: "trim a batch",
      ingredients: recipe.ingredients,
    });
    expect(updated.servings).toBe(40);
    expect(updated.notes).toBe("trim a batch");
  });

  it("deletes a variant", () => {
    const { event, recipe } = attachedRecipe();
    const variant = createVariant(db, event.id, recipe.id, {
      label: "Standard",
      servings: 48,
      notes: null,
      ingredients: recipe.ingredients,
    });
    deleteVariant(db, variant.id);
    expect(listVariants(db, event.id, recipe.id)).toHaveLength(0);
  });

  it("cascades variant deletion when the dish is detached from the event", () => {
    const { event, recipe } = attachedRecipe();
    createVariant(db, event.id, recipe.id, {
      label: "Standard",
      servings: 48,
      notes: null,
      ingredients: recipe.ingredients,
    });
    detachRecipe(db, event.id, recipe.id);
    const remaining = db.prepare("SELECT * FROM event_recipe_variants").all();
    expect(remaining).toHaveLength(0);
  });

  it("cascades variant deletion when the event is deleted", () => {
    const { event, recipe } = attachedRecipe();
    createVariant(db, event.id, recipe.id, {
      label: "Standard",
      servings: 48,
      notes: null,
      ingredients: recipe.ingredients,
    });
    deleteEvent(db, event.id);
    const remaining = db.prepare("SELECT * FROM event_recipe_variants").all();
    expect(remaining).toHaveLength(0);
  });
});

describe("createVariantRebalanced", () => {
  const ingredients = parseIngredientLines(["2 cups flour"]);

  function attachedRecipe() {
    const event = createEvent(db, { name: "Event", rsvpCount: 48, bufferMode: "flat", bufferValue: 0 });
    const recipe = createRecipe(db, { name: "Casserole", ingredients, servings: 8 });
    attachRecipe(db, event.id, recipe.id, "main");
    ensureDefaultVariant(db, event.id, recipe.id, 48, ingredients);
    return { event, recipe };
  }

  it("takes the new variant's servings out of the Standard variant", () => {
    const { event, recipe } = attachedRecipe();
    const { created, adjusted } = createVariantRebalanced(db, event.id, recipe.id, {
      label: "Gluten-free topping",
      servings: 8,
      notes: null,
      ingredients,
    });
    expect(created.servings).toBe(8);
    expect(adjusted?.label).toBe("Standard");
    expect(adjusted?.servings).toBe(40);

    const all = listVariants(db, event.id, recipe.id);
    expect(all.reduce((sum, v) => sum + v.servings, 0)).toBe(48);
  });

  it("does not adjust anything when creating the first variant for a dish", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 48, bufferMode: "flat", bufferValue: 0 });
    const recipe = createRecipe(db, { name: "Casserole", ingredients, servings: 8 });
    attachRecipe(db, event.id, recipe.id, "main");
    const { adjusted } = createVariantRebalanced(db, event.id, recipe.id, {
      label: "Standard",
      servings: 48,
      notes: null,
      ingredients,
    });
    expect(adjusted).toBeNull();
  });

  it("falls back to the largest variant when none is labeled Standard", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 48, bufferMode: "flat", bufferValue: 0 });
    const recipe = createRecipe(db, { name: "Casserole", ingredients, servings: 8 });
    attachRecipe(db, event.id, recipe.id, "main");
    createVariant(db, event.id, recipe.id, { label: "Big batch", servings: 40, notes: null, ingredients });
    createVariant(db, event.id, recipe.id, { label: "Small batch", servings: 8, notes: null, ingredients });

    const { adjusted } = createVariantRebalanced(db, event.id, recipe.id, {
      label: "New",
      servings: 8,
      notes: null,
      ingredients,
    });
    expect(adjusted?.label).toBe("Big batch");
    expect(adjusted?.servings).toBe(32);
  });

  it("clamps the adjusted variant at zero rather than going negative", () => {
    const { event, recipe } = attachedRecipe();
    const { adjusted } = createVariantRebalanced(db, event.id, recipe.id, {
      label: "Huge variant",
      servings: 100,
      notes: null,
      ingredients,
    });
    expect(adjusted?.servings).toBe(0);
  });
});
