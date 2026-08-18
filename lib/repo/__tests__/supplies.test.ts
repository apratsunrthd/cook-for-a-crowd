import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db";
import { createEvent } from "../events";
import { createSupply, deleteSupply, listSuppliesForEvent, updateSupply, type SupplyInput } from "../supplies";

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

function makeInput(overrides: Partial<SupplyInput> = {}): SupplyInput {
  return {
    name: "Plates",
    unit: "plate",
    perPersonQuantity: 1.1,
    targetHeadcount: null,
    notes: null,
    ...overrides,
  };
}

describe("supplies repo", () => {
  it("creates and lists supplies for an event", () => {
    createSupply(db, eventId, makeInput());
    createSupply(db, eventId, makeInput({ name: "Napkins" }));
    expect(listSuppliesForEvent(db, eventId).map((s) => s.name)).toEqual(["Plates", "Napkins"]);
  });

  it("only lists supplies belonging to the given event", () => {
    const otherEventId = createEvent(db, { name: "Other", rsvpCount: 10, bufferMode: "flat", bufferValue: 0 }).id;
    createSupply(db, eventId, makeInput());
    createSupply(db, otherEventId, makeInput({ name: "Ice" }));
    expect(listSuppliesForEvent(db, eventId).map((s) => s.name)).toEqual(["Plates"]);
  });

  it("updates a supply", () => {
    const supply = createSupply(db, eventId, makeInput());
    const updated = updateSupply(db, supply.id, makeInput({ perPersonQuantity: 1.5, targetHeadcount: 30 }));
    expect(updated.perPersonQuantity).toBe(1.5);
    expect(updated.targetHeadcount).toBe(30);
  });

  it("deletes a supply", () => {
    const supply = createSupply(db, eventId, makeInput());
    deleteSupply(db, supply.id);
    expect(listSuppliesForEvent(db, eventId)).toEqual([]);
  });

  it("deletes an event's supplies when the event is deleted (cascade)", () => {
    createSupply(db, eventId, makeInput());
    db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
    expect(listSuppliesForEvent(db, eventId)).toEqual([]);
  });
});
