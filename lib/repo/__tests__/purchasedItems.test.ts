import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db";
import { createEvent } from "../events";
import {
  createPurchasedItem,
  deletePurchasedItem,
  listPurchasedItemsForEvent,
  updatePurchasedItem,
  type PurchasedItemInput,
} from "../purchasedItems";

let db: Database.Database;
let eventId: number;

beforeEach(() => {
  db = createDb(":memory:");
  eventId = createEvent(db, {
    name: "Court of Honor",
    rsvpCount: 40,
    bufferMode: "flat",
    bufferValue: 5,
  }).id;
});

function makeInput(overrides: Partial<PurchasedItemInput> = {}): PurchasedItemInput {
  return {
    name: "Sheet cake",
    course: "dessert",
    quantityNote: "1 sheet cake, feeds ~40",
    notes: null,
    ...overrides,
  };
}

describe("purchased items repo", () => {
  it("creates and lists purchased items for an event", () => {
    createPurchasedItem(db, eventId, makeInput());
    createPurchasedItem(db, eventId, makeInput({ name: "Donuts", course: "dessert" }));
    expect(listPurchasedItemsForEvent(db, eventId).map((i) => i.name)).toEqual(["Sheet cake", "Donuts"]);
  });

  it("only lists items belonging to the given event", () => {
    const otherEventId = createEvent(db, { name: "Other", rsvpCount: 10, bufferMode: "flat", bufferValue: 0 }).id;
    createPurchasedItem(db, eventId, makeInput());
    createPurchasedItem(db, otherEventId, makeInput({ name: "Chips" }));
    expect(listPurchasedItemsForEvent(db, eventId).map((i) => i.name)).toEqual(["Sheet cake"]);
  });

  it("updates a purchased item", () => {
    const item = createPurchasedItem(db, eventId, makeInput());
    const updated = updatePurchasedItem(db, item.id, makeInput({ quantityNote: "2 sheet cakes" }));
    expect(updated.quantityNote).toBe("2 sheet cakes");
  });

  it("deletes a purchased item", () => {
    const item = createPurchasedItem(db, eventId, makeInput());
    deletePurchasedItem(db, item.id);
    expect(listPurchasedItemsForEvent(db, eventId)).toEqual([]);
  });

  it("deletes an event's purchased items when the event is deleted (cascade)", () => {
    createPurchasedItem(db, eventId, makeInput());
    db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
    expect(listPurchasedItemsForEvent(db, eventId)).toEqual([]);
  });
});
