"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { DrinkSuggestionError, suggestDrinksWithAI, type SuggestedDrink } from "../drinksAI";
import { createDrink, deleteDrink, updateDrink, type DrinkInput } from "../repo/drinks";
import { getEvent } from "../repo/events";
import type { ActionResult } from "./recipes";

export async function createDrinkAction(eventId: number, input: DrinkInput): Promise<void> {
  createDrink(getDb(), eventId, input);
  revalidatePath(`/events/${eventId}`);
}

export async function updateDrinkAction(eventId: number, drinkId: number, input: DrinkInput): Promise<void> {
  updateDrink(getDb(), drinkId, input);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteDrinkAction(eventId: number, drinkId: number): Promise<void> {
  deleteDrink(getDb(), drinkId);
  revalidatePath(`/events/${eventId}`);
}

export async function suggestDrinksAction(
  eventId: number,
  request: string,
  headcount: number,
  servingSizeOz: number,
): Promise<ActionResult<SuggestedDrink[]>> {
  if (!request.trim()) {
    return { ok: false, error: "Describe what drinks you want first." };
  }
  const event = getEvent(getDb(), eventId);
  if (!event) {
    return { ok: false, error: "Event not found." };
  }
  try {
    const drinks = await suggestDrinksWithAI({ request, headcount, servingSizeOz, eventContext: event.name });
    return { ok: true, data: drinks };
  } catch (err) {
    if (err instanceof DrinkSuggestionError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Something went wrong suggesting drinks." };
  }
}

/** Saves a batch of AI-suggested (or otherwise pre-built) drinks in one action, after the user has reviewed/edited them. */
export async function createDrinksAction(eventId: number, inputs: DrinkInput[]): Promise<void> {
  const db = getDb();
  for (const input of inputs) {
    createDrink(db, eventId, input);
  }
  revalidatePath(`/events/${eventId}`);
}
