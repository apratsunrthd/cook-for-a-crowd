import type Database from "better-sqlite3";
import type { BufferMode, Event } from "../types";

interface EventRow {
  id: number;
  name: string;
  event_date: string | null;
  rsvp_count: number;
  buffer_mode: BufferMode;
  buffer_value: number;
  created_at: string;
  updated_at: string;
}

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    eventDate: row.event_date,
    rsvpCount: row.rsvp_count,
    bufferMode: row.buffer_mode,
    bufferValue: row.buffer_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EventInput {
  name: string;
  eventDate?: string | null;
  rsvpCount: number;
  bufferMode: BufferMode;
  bufferValue: number;
}

export function listEvents(db: Database.Database): Event[] {
  const rows = db
    .prepare("SELECT * FROM events ORDER BY event_date IS NULL, event_date DESC")
    .all() as EventRow[];
  return rows.map(rowToEvent);
}

export function getEvent(db: Database.Database, id: number): Event | null {
  const row = db.prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
  return row ? rowToEvent(row) : null;
}

export function createEvent(db: Database.Database, input: EventInput): Event {
  const result = db
    .prepare(
      `INSERT INTO events (name, event_date, rsvp_count, buffer_mode, buffer_value)
       VALUES (@name, @eventDate, @rsvpCount, @bufferMode, @bufferValue)`,
    )
    .run({
      name: input.name,
      eventDate: input.eventDate ?? null,
      rsvpCount: input.rsvpCount,
      bufferMode: input.bufferMode,
      bufferValue: input.bufferValue,
    });
  const event = getEvent(db, Number(result.lastInsertRowid));
  if (!event) throw new Error("Failed to load event after insert");
  return event;
}

export function updateEvent(db: Database.Database, id: number, input: EventInput): Event {
  db.prepare(
    `UPDATE events SET
       name = @name,
       event_date = @eventDate,
       rsvp_count = @rsvpCount,
       buffer_mode = @bufferMode,
       buffer_value = @bufferValue,
       updated_at = datetime('now')
     WHERE id = @id`,
  ).run({
    id,
    name: input.name,
    eventDate: input.eventDate ?? null,
    rsvpCount: input.rsvpCount,
    bufferMode: input.bufferMode,
    bufferValue: input.bufferValue,
  });
  const event = getEvent(db, id);
  if (!event) throw new Error(`Event ${id} not found after update`);
  return event;
}

export function deleteEvent(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM events WHERE id = ?").run(id);
}
