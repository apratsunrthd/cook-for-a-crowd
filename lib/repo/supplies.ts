import type Database from "better-sqlite3";
import type { EventSupply } from "../types";

interface SupplyRow {
  id: number;
  event_id: number;
  name: string;
  unit: string;
  per_person_quantity: number;
  target_headcount: number | null;
  notes: string | null;
}

function rowToSupply(row: SupplyRow): EventSupply {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    unit: row.unit,
    perPersonQuantity: row.per_person_quantity,
    targetHeadcount: row.target_headcount,
    notes: row.notes,
  };
}

export interface SupplyInput {
  name: string;
  unit: string;
  perPersonQuantity: number;
  targetHeadcount: number | null;
  notes: string | null;
}

export function listSuppliesForEvent(db: Database.Database, eventId: number): EventSupply[] {
  const rows = db
    .prepare("SELECT * FROM event_supplies WHERE event_id = ? ORDER BY id")
    .all(eventId) as SupplyRow[];
  return rows.map(rowToSupply);
}

export function getSupply(db: Database.Database, id: number): EventSupply | null {
  const row = db.prepare("SELECT * FROM event_supplies WHERE id = ?").get(id) as SupplyRow | undefined;
  return row ? rowToSupply(row) : null;
}

export function createSupply(db: Database.Database, eventId: number, input: SupplyInput): EventSupply {
  const result = db
    .prepare(
      `INSERT INTO event_supplies (event_id, name, unit, per_person_quantity, target_headcount, notes)
       VALUES (@eventId, @name, @unit, @perPersonQuantity, @targetHeadcount, @notes)`,
    )
    .run({ eventId, ...input });
  const supply = getSupply(db, Number(result.lastInsertRowid));
  if (!supply) throw new Error("Failed to load supply after insert");
  return supply;
}

export function updateSupply(db: Database.Database, id: number, input: SupplyInput): EventSupply {
  db.prepare(
    `UPDATE event_supplies SET
       name = @name,
       unit = @unit,
       per_person_quantity = @perPersonQuantity,
       target_headcount = @targetHeadcount,
       notes = @notes,
       updated_at = datetime('now')
     WHERE id = @id`,
  ).run({ id, ...input });
  const supply = getSupply(db, id);
  if (!supply) throw new Error(`Supply ${id} not found after update`);
  return supply;
}

export function deleteSupply(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM event_supplies WHERE id = ?").run(id);
}
