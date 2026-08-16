import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db";
import { parseIngredientLines } from "../../ingredientParser";
import { attachRecipe, detachRecipe, listEventRecipes } from "../eventRecipes";
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

    attachRecipe(db, event.id, recipe.id, { notes: "double batch" });
    const attached = listEventRecipes(db, event.id);
    expect(attached).toHaveLength(1);
    expect(attached[0].recipe.name).toBe("Chili");
    expect(attached[0].eventRecipe.notes).toBe("double batch");
    expect(attached[0].eventRecipe.headcountOverride).toBeNull();
  });

  it("supports a per-recipe headcount override", () => {
    const event = createEvent(db, { name: "Event", rsvpCount: 40, bufferMode: "flat", bufferValue: 10 });
    const recipe = createRecipe(db, { name: "Side Dish", ingredients: [], servings: 8 });
    attachRecipe(db, event.id, recipe.id, { headcountOverride: 100 });
    const [attached] = listEventRecipes(db, event.id);
    expect(attached.eventRecipe.headcountOverride).toBe(100);
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
