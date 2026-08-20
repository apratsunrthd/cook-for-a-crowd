import type Database from "better-sqlite3";
import type { EventDrink } from "../types";

interface DrinkRow {
  id: number;
  event_id: number;
  name: string;
  unit_label: string;
  package_size_oz: number;
  serving_size_oz: number;
  target_headcount: number | null;
  notes: string | null;
}

function rowToDrink(row: DrinkRow): EventDrink {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    unitLabel: row.unit_label,
    packageSizeOz: row.package_size_oz,
    servingSizeOz: row.serving_size_oz,
    targetHeadcount: row.target_headcount,
    notes: row.notes,
  };
}

export interface DrinkInput {
  name: string;
  unitLabel: string;
  packageSizeOz: number;
  servingSizeOz: number;
  targetHeadcount: number | null;
  notes: string | null;
}

export function listDrinksForEvent(db: Database.Database, eventId: number): EventDrink[] {
  const rows = db
    .prepare("SELECT * FROM event_drinks WHERE event_id = ? ORDER BY id")
    .all(eventId) as DrinkRow[];
  return rows.map(rowToDrink);
}

export function getDrink(db: Database.Database, id: number): EventDrink | null {
  const row = db.prepare("SELECT * FROM event_drinks WHERE id = ?").get(id) as DrinkRow | undefined;
  return row ? rowToDrink(row) : null;
}

export function createDrink(db: Database.Database, eventId: number, input: DrinkInput): EventDrink {
  const result = db
    .prepare(
      `INSERT INTO event_drinks (event_id, name, unit_label, package_size_oz, serving_size_oz, target_headcount, notes)
       VALUES (@eventId, @name, @unitLabel, @packageSizeOz, @servingSizeOz, @targetHeadcount, @notes)`,
    )
    .run({ eventId, ...input });
  const drink = getDrink(db, Number(result.lastInsertRowid));
  if (!drink) throw new Error("Failed to load drink after insert");
  return drink;
}

export function updateDrink(db: Database.Database, id: number, input: DrinkInput): EventDrink {
  db.prepare(
    `UPDATE event_drinks SET
       name = @name,
       unit_label = @unitLabel,
       package_size_oz = @packageSizeOz,
       serving_size_oz = @servingSizeOz,
       target_headcount = @targetHeadcount,
       notes = @notes,
       updated_at = datetime('now')
     WHERE id = @id`,
  ).run({ id, ...input });
  const drink = getDrink(db, id);
  if (!drink) throw new Error(`Drink ${id} not found after update`);
  return drink;
}

export function deleteDrink(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM event_drinks WHERE id = ?").run(id);
}
