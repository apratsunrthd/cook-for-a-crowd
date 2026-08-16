import type Database from "better-sqlite3";
import type { EventRecipe, ParsedIngredient, Recipe } from "../types";

interface JoinedRow {
  event_id: number;
  recipe_id: number;
  headcount_override: number | null;
  notes: string | null;
  name: string;
  source_url: string | null;
  servings: number | null;
  raw_yield_text: string | null;
  ingredients_json: string;
  instructions: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRecipeWithRecipe {
  eventRecipe: EventRecipe;
  recipe: Recipe;
}

function rowToJoined(row: JoinedRow): EventRecipeWithRecipe {
  return {
    eventRecipe: {
      eventId: row.event_id,
      recipeId: row.recipe_id,
      headcountOverride: row.headcount_override,
      notes: row.notes,
    },
    recipe: {
      id: row.recipe_id,
      name: row.name,
      sourceUrl: row.source_url,
      servings: row.servings,
      rawYieldText: row.raw_yield_text,
      ingredients: JSON.parse(row.ingredients_json) as ParsedIngredient[],
      instructions: row.instructions,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

export function listEventRecipes(db: Database.Database, eventId: number): EventRecipeWithRecipe[] {
  const rows = db
    .prepare(
      `SELECT er.event_id, er.recipe_id, er.headcount_override, er.notes,
              r.name, r.source_url, r.servings, r.raw_yield_text, r.ingredients_json,
              r.instructions, r.image_url, r.created_at, r.updated_at
       FROM event_recipes er
       JOIN recipes r ON r.id = er.recipe_id
       WHERE er.event_id = ?
       ORDER BY r.name COLLATE NOCASE`,
    )
    .all(eventId) as JoinedRow[];
  return rows.map(rowToJoined);
}

export function attachRecipe(
  db: Database.Database,
  eventId: number,
  recipeId: number,
  options: { headcountOverride?: number | null; notes?: string | null } = {},
): void {
  db.prepare(
    `INSERT INTO event_recipes (event_id, recipe_id, headcount_override, notes)
     VALUES (@eventId, @recipeId, @headcountOverride, @notes)
     ON CONFLICT (event_id, recipe_id) DO UPDATE SET
       headcount_override = @headcountOverride,
       notes = @notes`,
  ).run({
    eventId,
    recipeId,
    headcountOverride: options.headcountOverride ?? null,
    notes: options.notes ?? null,
  });
}

export function detachRecipe(db: Database.Database, eventId: number, recipeId: number): void {
  db.prepare("DELETE FROM event_recipes WHERE event_id = ? AND recipe_id = ?").run(eventId, recipeId);
}
