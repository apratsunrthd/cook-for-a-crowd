"use server";

import { revalidatePath } from "next/cache";
import { generateRecipeWithAI, RecipeGenerationError } from "../aiRecipe";
import { getDb } from "../db";
import { fillMissingGrams } from "../ingredientWeightAI";
import { fillPanSizeGap } from "../panSizeAI";
import { detachRecipe as detachRecipeFromEvent } from "../repo/eventRecipes";
import {
  DuplicateSourceUrlError,
  type RecipeInput,
  createRecipe,
  deleteRecipe,
  updateRecipe,
} from "../repo/recipes";
import {
  RecipeImportError,
  importRecipeFromUrl,
  parseRecipeFromHtml,
  type ImportedRecipeDraft,
} from "../recipeImport";
import { parseRecipeFromPlainText } from "../recipeTextParse";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const BARE_URL_PATTERN = /^https?:\/\/\S+$/i;
const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;

/**
 * One box, three shapes of input: a bare URL (fetched server-side), pasted
 * HTML source (parsed with the same structured-data logic as URL import,
 * for when a URL fetch gets blocked but the user can reach the page in
 * their own browser), or pasted plain recipe text (heuristic Ingredients/
 * Instructions split). Auto-detects which one it got.
 */
export async function importRecipeDraftAction(pasted: string): Promise<ActionResult<ImportedRecipeDraft>> {
  const trimmed = pasted.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a recipe URL, page HTML, or recipe text first." };
  }

  if (BARE_URL_PATTERN.test(trimmed) && !trimmed.includes("\n")) {
    try {
      const draft = await importRecipeFromUrl(trimmed);
      return { ok: true, data: await fillPanSizeGap(draft) };
    } catch (err) {
      if (err instanceof RecipeImportError) {
        return {
          ok: false,
          error: `${err.message} If the site blocks automated fetches, paste the page's HTML (view-source) or its visible text instead.`,
        };
      }
      return { ok: false, error: "Something went wrong importing that recipe." };
    }
  }

  try {
    const draft = HTML_PATTERN.test(trimmed)
      ? parseRecipeFromHtml(trimmed, null)
      : parseRecipeFromPlainText(trimmed);
    return { ok: true, data: await fillPanSizeGap(draft) };
  } catch (err) {
    if (err instanceof RecipeImportError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Couldn't find a recipe in that." };
  }
}

export async function generateRecipeDraftAction(
  prompt: string,
): Promise<ActionResult<ImportedRecipeDraft>> {
  if (!prompt.trim()) {
    return { ok: false, error: "Describe what recipe you want first." };
  }
  try {
    const draft = await generateRecipeWithAI(prompt);
    return { ok: true, data: draft };
  } catch (err) {
    if (err instanceof RecipeGenerationError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Something went wrong generating that recipe." };
  }
}

export async function saveRecipeAction(
  id: number | null,
  input: RecipeInput,
): Promise<ActionResult<{ id: number }>> {
  const db = getDb();
  try {
    const ingredients = await fillMissingGrams(input.ingredients);
    const recipe =
      id === null
        ? createRecipe(db, { ...input, ingredients })
        : updateRecipe(db, id, { ...input, ingredients });
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
