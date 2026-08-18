"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { createDrink, deleteDrink, updateDrink, type DrinkInput } from "../repo/drinks";

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
