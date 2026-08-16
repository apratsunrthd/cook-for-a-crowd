import type Database from "better-sqlite3";
import type { ParsedIngredient, Recipe } from "../types";

interface RecipeRow {
  id: number;
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

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    sourceUrl: row.source_url,
    servings: row.servings,
    rawYieldText: row.raw_yield_text,
    ingredients: JSON.parse(row.ingredients_json) as ParsedIngredient[],
    instructions: row.instructions,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RecipeInput {
  name: string;
  sourceUrl?: string | null;
  servings?: number | null;
  rawYieldText?: string | null;
  ingredients: ParsedIngredient[];
  instructions?: string | null;
  imageUrl?: string | null;
}

export class DuplicateSourceUrlError extends Error {
  constructor(sourceUrl: string, public existingRecipeId: number) {
    super(`A recipe imported from ${sourceUrl} already exists.`);
    this.name = "DuplicateSourceUrlError";
  }
}

export function listRecipes(db: Database.Database): Recipe[] {
  const rows = db.prepare("SELECT * FROM recipes ORDER BY name COLLATE NOCASE").all() as RecipeRow[];
  return rows.map(rowToRecipe);
}

export function getRecipe(db: Database.Database, id: number): Recipe | null {
  const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as RecipeRow | undefined;
  return row ? rowToRecipe(row) : null;
}

export function findRecipeBySourceUrl(db: Database.Database, sourceUrl: string): Recipe | null {
  const row = db.prepare("SELECT * FROM recipes WHERE source_url = ?").get(sourceUrl) as
    | RecipeRow
    | undefined;
  return row ? rowToRecipe(row) : null;
}

export function createRecipe(db: Database.Database, input: RecipeInput): Recipe {
  if (input.sourceUrl) {
    const existing = findRecipeBySourceUrl(db, input.sourceUrl);
    if (existing) {
      throw new DuplicateSourceUrlError(input.sourceUrl, existing.id);
    }
  }
  const result = db
    .prepare(
      `INSERT INTO recipes (name, source_url, servings, raw_yield_text, ingredients_json, instructions, image_url)
       VALUES (@name, @sourceUrl, @servings, @rawYieldText, @ingredientsJson, @instructions, @imageUrl)`,
    )
    .run({
      name: input.name,
      sourceUrl: input.sourceUrl ?? null,
      servings: input.servings ?? null,
      rawYieldText: input.rawYieldText ?? null,
      ingredientsJson: JSON.stringify(input.ingredients),
      instructions: input.instructions ?? null,
      imageUrl: input.imageUrl ?? null,
    });
  const recipe = getRecipe(db, Number(result.lastInsertRowid));
  if (!recipe) throw new Error("Failed to load recipe after insert");
  return recipe;
}

export function updateRecipe(db: Database.Database, id: number, input: RecipeInput): Recipe {
  if (input.sourceUrl) {
    const existing = findRecipeBySourceUrl(db, input.sourceUrl);
    if (existing && existing.id !== id) {
      throw new DuplicateSourceUrlError(input.sourceUrl, existing.id);
    }
  }
  db.prepare(
    `UPDATE recipes SET
       name = @name,
       source_url = @sourceUrl,
       servings = @servings,
       raw_yield_text = @rawYieldText,
       ingredients_json = @ingredientsJson,
       instructions = @instructions,
       image_url = @imageUrl,
       updated_at = datetime('now')
     WHERE id = @id`,
  ).run({
    id,
    name: input.name,
    sourceUrl: input.sourceUrl ?? null,
    servings: input.servings ?? null,
    rawYieldText: input.rawYieldText ?? null,
    ingredientsJson: JSON.stringify(input.ingredients),
    instructions: input.instructions ?? null,
    imageUrl: input.imageUrl ?? null,
  });
  const recipe = getRecipe(db, id);
  if (!recipe) throw new Error(`Recipe ${id} not found after update`);
  return recipe;
}

export function deleteRecipe(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}
