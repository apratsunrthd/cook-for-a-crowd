"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import {
  createPurchasedItem,
  deletePurchasedItem,
  updatePurchasedItem,
  type PurchasedItemInput,
} from "../repo/purchasedItems";

export async function createPurchasedItemAction(eventId: number, input: PurchasedItemInput): Promise<void> {
  createPurchasedItem(getDb(), eventId, input);
  revalidatePath(`/events/${eventId}`);
}

export async function updatePurchasedItemAction(
  eventId: number,
  itemId: number,
  input: PurchasedItemInput,
): Promise<void> {
  updatePurchasedItem(getDb(), itemId, input);
  revalidatePath(`/events/${eventId}`);
}

export async function deletePurchasedItemAction(eventId: number, itemId: number): Promise<void> {
  deletePurchasedItem(getDb(), itemId);
  revalidatePath(`/events/${eventId}`);
}
