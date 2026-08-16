"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { detachRecipe as detachRecipeFromEvent } from "../repo/eventRecipes";
import {
  DuplicateSourceUrlError,
  type RecipeInput,
  createRecipe,
  deleteRecipe,
  updateRecipe,
} from "../repo/recipes";
import { RecipeImportError, importRecipeFromUrl, type ImportedRecipeDraft } from "../recipeImport";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function importRecipeDraftAction(url: string): Promise<ActionResult<ImportedRecipeDraft>> {
  try {
    const draft = await importRecipeFromUrl(url);
    return { ok: true, data: draft };
  } catch (err) {
    if (err instanceof RecipeImportError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Something went wrong importing that recipe." };
  }
}

export async function saveRecipeAction(
  id: number | null,
  input: RecipeInput,
): Promise<ActionResult<{ id: number }>> {
  const db = getDb();
  try {
    const recipe = id === null ? createRecipe(db, input) : updateRecipe(db, id, input);
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipe.id}`);
    return { ok: true, data: { id: recipe.id } };
  } catch (err) {
    if (err instanceof DuplicateSourceUrlError) {
      return { ok: false, error: `${err.message} (recipe #${err.existingRecipeId})` };
    }
    return { ok: false, error: "Failed to save recipe." };
  }
}

export async function deleteRecipeAction(id: number): Promise<void> {
  deleteRecipe(getDb(), id);
  revalidatePath("/recipes");
}

export async function detachRecipeAction(eventId: number, recipeId: number): Promise<void> {
  const db = getDb();
  detachRecipeFromEvent(db, eventId, recipeId);
  revalidatePath(`/events/${eventId}`);
}
