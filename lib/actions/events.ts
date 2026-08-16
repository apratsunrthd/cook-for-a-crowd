"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { attachRecipe } from "../repo/eventRecipes";
import { type EventInput, createEvent, deleteEvent, updateEvent } from "../repo/events";
import type { ActionResult } from "./recipes";

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

export async function attachRecipeAction(
  eventId: number,
  recipeId: number,
  options: { headcountOverride?: number | null; notes?: string | null } = {},
): Promise<void> {
  attachRecipe(getDb(), eventId, recipeId, options);
  revalidatePath(`/events/${eventId}`);
}
