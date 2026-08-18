CREATE TABLE event_drinks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  package_size_oz REAL NOT NULL,
  serving_size_oz REAL NOT NULL,
  target_headcount INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
