CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  source_url TEXT UNIQUE,
  servings INTEGER,
  raw_yield_text TEXT,
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  instructions TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event_date TEXT,
  rsvp_count INTEGER NOT NULL DEFAULT 0,
  buffer_mode TEXT NOT NULL DEFAULT 'percentage' CHECK (buffer_mode IN ('percentage', 'flat')),
  buffer_value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE event_recipes (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  headcount_override INTEGER,
  notes TEXT,
  PRIMARY KEY (event_id, recipe_id)
);
