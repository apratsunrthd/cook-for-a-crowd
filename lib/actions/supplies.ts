"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { createSupply, deleteSupply, updateSupply, type SupplyInput } from "../repo/supplies";

export async function createSupplyAction(eventId: number, input: SupplyInput): Promise<void> {
  createSupply(getDb(), eventId, input);
  revalidatePath(`/events/${eventId}`);
}

export async function updateSupplyAction(eventId: number, supplyId: number, input: SupplyInput): Promise<void> {
  updateSupply(getDb(), supplyId, input);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteSupplyAction(eventId: number, supplyId: number): Promise<void> {
  deleteSupply(getDb(), supplyId);
  revalidatePath(`/events/${eventId}`);
}
