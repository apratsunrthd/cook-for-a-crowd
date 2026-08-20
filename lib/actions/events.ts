"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { fillMissingIngredientDetails } from "../ingredientWeightAI";
import {
  attachRecipe,
  createVariantRebalanced,
  deleteVariant,
  ensureDefaultVariant,
  updateVariant,
  type VariantInput,
} from "../repo/eventRecipes";
import { type EventInput, createEvent, deleteEvent, updateEvent, getEvent } from "../repo/events";
import { getRecipe } from "../repo/recipes";
import { effectiveHeadcount, roundUpToWholeBatches } from "../scale";
import type { Course } from "../types";
import type { ActionResult } from "./recipes";

/** Used by the recipe editor to default a new variant's servings to the event's full headcount. */
export async function getEventHeadcountAction(eventId: number): Promise<number | null> {
  const event = getEvent(getDb(), eventId);
  return event ? effectiveHeadcount(event) : null;
}

export async function saveEventAction(
  id: number | null,
  input: EventInput,
): Promise<ActionResult<{ id: number }>> {
  const db = getDb();
  try {
    const event = id === null ? createEvent(db, input) : updateEvent(db, id, input);
    revalidatePath("/");
    revalidatePath(`/events/${event.id}`);
    return { ok: true, data: { id: event.id } };
  } catch {
    return { ok: false, error: "Failed to save event." };
  }
}

export async function deleteEventAction(id: number): Promise<void> {
  deleteEvent(getDb(), id);
  revalidatePath("/");
}

/**
 * Attaches a recipe to an event's meal plan and gives it a starting
 * "Standard" variant if it doesn't have one yet. The default variant rounds
 * the target headcount up to a whole number of batches of the recipe (e.g.
 * needing 57 people from a 6-serving recipe defaults to 10 batches / 60
 * people, not a fractional 9.5x scale) so you never end up short.
 */
export async function attachRecipeAction(
  eventId: number,
  recipeId: number,
  course: Course,
  targetHeadcount: number,
): Promise<void> {
  const db = getDb();
  const recipe = getRecipe(db, recipeId);
  attachRecipe(db, eventId, recipeId, course);
  const defaultServings = roundUpToWholeBatches(targetHeadcount, recipe?.servings ?? null);
  ensureDefaultVariant(db, eventId, recipeId, defaultServings, recipe?.ingredients ?? []);
  revalidatePath(`/events/${eventId}`);
}

/** Adding a variant takes its servings out of the dish's "Standard" variant so the dish's total headcount doesn't silently grow. */
export async function createVariantAction(
  eventId: number,
  recipeId: number,
  input: VariantInput,
): Promise<void> {
  const ingredients = await fillMissingIngredientDetails(input.ingredients);
  createVariantRebalanced(getDb(), eventId, recipeId, { ...input, ingredients });
  revalidatePath(`/events/${eventId}`);
}

export async function updateVariantAction(
  eventId: number,
  variantId: number,
  input: VariantInput,
): Promise<void> {
  const ingredients = await fillMissingIngredientDetails(input.ingredients);
  updateVariant(getDb(), variantId, { ...input, ingredients });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteVariantAction(eventId: number, variantId: number): Promise<void> {
  deleteVariant(getDb(), variantId);
  revalidatePath(`/events/${eventId}`);
}
