import type Database from "better-sqlite3";
import type { PanSize } from "../panSize";
import type { Course, EventRecipe, ParsedIngredient, Recipe, RecipeVariant } from "../types";

interface JoinedRow {
  event_id: number;
  recipe_id: number;
  course: Course;
  name: string;
  source_url: string | null;
  servings: number | null;
  raw_yield_text: string | null;
  ingredients_json: string;
  instructions: string | null;
  image_url: string | null;
  pan_size_json: string | null;
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
      course: row.course,
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
      panSize: row.pan_size_json ? JSON.parse(row.pan_size_json) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

export function listEventRecipes(db: Database.Database, eventId: number): EventRecipeWithRecipe[] {
  const rows = db
    .prepare(
      `SELECT er.event_id, er.recipe_id, er.course,
              r.name, r.source_url, r.servings, r.raw_yield_text, r.ingredients_json,
              r.instructions, r.image_url, r.pan_size_json, r.created_at, r.updated_at
       FROM event_recipes er
       JOIN recipes r ON r.id = er.recipe_id
       WHERE er.event_id = ?
       ORDER BY r.name COLLATE NOCASE`,
    )
    .all(eventId) as JoinedRow[];
  return rows.map(rowToJoined);
}

/** Attaches a recipe to an event (or updates its course if already attached). */
export function attachRecipe(
  db: Database.Database,
  eventId: number,
  recipeId: number,
  course: Course = "main",
): void {
  db.prepare(
    `INSERT INTO event_recipes (event_id, recipe_id, course)
     VALUES (@eventId, @recipeId, @course)
     ON CONFLICT (event_id, recipe_id) DO UPDATE SET course = @course`,
  ).run({ eventId, recipeId, course });
}

export function detachRecipe(db: Database.Database, eventId: number, recipeId: number): void {
  db.prepare("DELETE FROM event_recipes WHERE event_id = ? AND recipe_id = ?").run(eventId, recipeId);
}

interface VariantRow {
  id: number;
  event_id: number;
  recipe_id: number;
  label: string;
  servings: number;
  notes: string | null;
  ingredients_json: string;
  pan_size_json: string | null;
}

function rowToVariant(row: VariantRow): RecipeVariant {
  return {
    id: row.id,
    eventId: row.event_id,
    recipeId: row.recipe_id,
    label: row.label,
    servings: row.servings,
    notes: row.notes,
    ingredients: JSON.parse(row.ingredients_json) as ParsedIngredient[],
    panSize: row.pan_size_json ? JSON.parse(row.pan_size_json) : null,
  };
}

export function listVariants(db: Database.Database, eventId: number, recipeId: number): RecipeVariant[] {
  const rows = db
    .prepare("SELECT * FROM event_recipe_variants WHERE event_id = ? AND recipe_id = ? ORDER BY id")
    .all(eventId, recipeId) as VariantRow[];
  return rows.map(rowToVariant);
}

export function listAllVariantsForEvent(db: Database.Database, eventId: number): RecipeVariant[] {
  const rows = db
    .prepare("SELECT * FROM event_recipe_variants WHERE event_id = ? ORDER BY id")
    .all(eventId) as VariantRow[];
  return rows.map(rowToVariant);
}

/**
 * Ensures a freshly-attached dish has at least one variant, defaulting to
 * the event's full headcount and a copy of the recipe's own ingredients.
 */
export function ensureDefaultVariant(
  db: Database.Database,
  eventId: number,
  recipeId: number,
  defaultServings: number,
  defaultIngredients: ParsedIngredient[],
): void {
  const existing = db
    .prepare("SELECT 1 FROM event_recipe_variants WHERE event_id = ? AND recipe_id = ? LIMIT 1")
    .get(eventId, recipeId);
  if (existing) return;
  db.prepare(
    `INSERT INTO event_recipe_variants (event_id, recipe_id, label, servings, ingredients_json)
     VALUES (?, ?, 'Standard', ?, ?)`,
  ).run(eventId, recipeId, defaultServings, JSON.stringify(defaultIngredients));
}

export interface VariantInput {
  label: string;
  servings: number;
  notes: string | null;
  ingredients: ParsedIngredient[];
  /** Overrides the recipe's native pan for this variant; null/omitted uses the recipe's own pan. */
  panSize?: PanSize | null;
}

export function createVariant(
  db: Database.Database,
  eventId: number,
  recipeId: number,
  input: VariantInput,
): RecipeVariant {
  const result = db
    .prepare(
      `INSERT INTO event_recipe_variants (event_id, recipe_id, label, servings, notes, ingredients_json, pan_size_json)
       VALUES (@eventId, @recipeId, @label, @servings, @notes, @ingredientsJson, @panSizeJson)`,
    )
    .run({
      eventId,
      recipeId,
      label: input.label,
      servings: input.servings,
      notes: input.notes,
      ingredientsJson: JSON.stringify(input.ingredients),
      panSizeJson: input.panSize ? JSON.stringify(input.panSize) : null,
    });
  const row = db
    .prepare("SELECT * FROM event_recipe_variants WHERE id = ?")
    .get(result.lastInsertRowid) as VariantRow;
  return rowToVariant(row);
}

/**
 * Creates a new variant and, if the dish already has other variants, takes
 * the new variant's servings out of the "Standard" one (or whichever
 * existing variant currently has the most servings) so the dish's total
 * stays where it was instead of silently growing.
 */
export function createVariantRebalanced(
  db: Database.Database,
  eventId: number,
  recipeId: number,
  input: VariantInput,
): { created: RecipeVariant; adjusted: RecipeVariant | null } {
  const existing = listVariants(db, eventId, recipeId);
  const created = createVariant(db, eventId, recipeId, input);

  if (existing.length === 0) {
    return { created, adjusted: null };
  }

  const target =
    existing.find((v) => v.label.trim().toLowerCase() === "standard") ??
    existing.reduce((largest, v) => (v.servings > largest.servings ? v : largest));

  const adjusted = updateVariant(db, target.id, {
    label: target.label,
    servings: Math.max(0, target.servings - input.servings),
    notes: target.notes,
    ingredients: target.ingredients,
    panSize: target.panSize,
  });

  return { created, adjusted };
}

export function updateVariant(db: Database.Database, id: number, input: VariantInput): RecipeVariant {
  db.prepare(
    `UPDATE event_recipe_variants SET
       label = @label, servings = @servings, notes = @notes, ingredients_json = @ingredientsJson, pan_size_json = @panSizeJson
     WHERE id = @id`,
  ).run({
    id,
    label: input.label,
    servings: input.servings,
    notes: input.notes,
    ingredientsJson: JSON.stringify(input.ingredients),
    panSizeJson: input.panSize ? JSON.stringify(input.panSize) : null,
  });
  const row = db.prepare("SELECT * FROM event_recipe_variants WHERE id = ?").get(id) as
    | VariantRow
    | undefined;
  if (!row) throw new Error(`Variant ${id} not found after update`);
  return rowToVariant(row);
}

export function deleteVariant(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM event_recipe_variants WHERE id = ?").run(id);
}
