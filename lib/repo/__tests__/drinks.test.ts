import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../../db";
import { createEvent } from "../events";
import { createDrink, deleteDrink, listDrinksForEvent, updateDrink, type DrinkInput } from "../drinks";

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

function makeInput(overrides: Partial<DrinkInput> = {}): DrinkInput {
  return {
    name: "Sweet tea",
    unitLabel: "gallon",
    packageSizeOz: 128,
    servingSizeOz: 8,
    targetHeadcount: null,
    notes: null,
    ...overrides,
  };
}

describe("drinks repo", () => {
  it("creates and lists drinks for an event", () => {
    createDrink(db, eventId, makeInput());
    createDrink(db, eventId, makeInput({ name: "Lemonade" }));
    const drinks = listDrinksForEvent(db, eventId);
    expect(drinks.map((d) => d.name)).toEqual(["Sweet tea", "Lemonade"]);
  });

  it("only lists drinks belonging to the given event", () => {
    const otherEventId = createEvent(db, {
      name: "Other event",
      rsvpCount: 10,
      bufferMode: "flat",
      bufferValue: 0,
    }).id;
    createDrink(db, eventId, makeInput());
    createDrink(db, otherEventId, makeInput({ name: "Water" }));
    expect(listDrinksForEvent(db, eventId).map((d) => d.name)).toEqual(["Sweet tea"]);
  });

  it("updates a drink", () => {
    const drink = createDrink(db, eventId, makeInput());
    const updated = updateDrink(db, drink.id, makeInput({ name: "Sweet tea (extra sweet)", targetHeadcount: 30 }));
    expect(updated.name).toBe("Sweet tea (extra sweet)");
    expect(updated.targetHeadcount).toBe(30);
  });

  it("deletes a drink", () => {
    const drink = createDrink(db, eventId, makeInput());
    deleteDrink(db, drink.id);
    expect(listDrinksForEvent(db, eventId)).toEqual([]);
  });

  it("deletes an event's drinks when the event is deleted (cascade)", () => {
    createDrink(db, eventId, makeInput());
    db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
    expect(listDrinksForEvent(db, eventId)).toEqual([]);
  });
});
