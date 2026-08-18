import type Database from "better-sqlite3";
import type { Course, EventPurchasedItem } from "../types";

interface PurchasedItemRow {
  id: number;
  event_id: number;
  name: string;
  course: Course;
  quantity_note: string;
  notes: string | null;
}

function rowToPurchasedItem(row: PurchasedItemRow): EventPurchasedItem {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    course: row.course,
    quantityNote: row.quantity_note,
    notes: row.notes,
  };
}

export interface PurchasedItemInput {
  name: string;
  course: Course;
  quantityNote: string;
  notes: string | null;
}

export function listPurchasedItemsForEvent(db: Database.Database, eventId: number): EventPurchasedItem[] {
  const rows = db
    .prepare("SELECT * FROM event_purchased_items WHERE event_id = ? ORDER BY id")
    .all(eventId) as PurchasedItemRow[];
  return rows.map(rowToPurchasedItem);
}

export function getPurchasedItem(db: Database.Database, id: number): EventPurchasedItem | null {
  const row = db
    .prepare("SELECT * FROM event_purchased_items WHERE id = ?")
    .get(id) as PurchasedItemRow | undefined;
  return row ? rowToPurchasedItem(row) : null;
}

export function createPurchasedItem(
  db: Database.Database,
  eventId: number,
  input: PurchasedItemInput,
): EventPurchasedItem {
  const result = db
    .prepare(
      `INSERT INTO event_purchased_items (event_id, name, course, quantity_note, notes)
       VALUES (@eventId, @name, @course, @quantityNote, @notes)`,
    )
    .run({ eventId, ...input });
  const item = getPurchasedItem(db, Number(result.lastInsertRowid));
  if (!item) throw new Error("Failed to load purchased item after insert");
  return item;
}

export function updatePurchasedItem(
  db: Database.Database,
  id: number,
  input: PurchasedItemInput,
): EventPurchasedItem {
  db.prepare(
    `UPDATE event_purchased_items SET
       name = @name,
       course = @course,
       quantity_note = @quantityNote,
       notes = @notes,
       updated_at = datetime('now')
     WHERE id = @id`,
  ).run({ id, ...input });
  const item = getPurchasedItem(db, id);
  if (!item) throw new Error(`Purchased item ${id} not found after update`);
  return item;
}

export function deletePurchasedItem(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM event_purchased_items WHERE id = ?").run(id);
}
