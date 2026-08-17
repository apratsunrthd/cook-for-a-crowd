ALTER TABLE event_recipes ADD COLUMN course TEXT NOT NULL DEFAULT 'main' CHECK (course IN ('main', 'side', 'dessert'));
ALTER TABLE event_recipes DROP COLUMN headcount_override;
ALTER TABLE event_recipes DROP COLUMN notes;

-- A dish attached to an event can be split into multiple variants -- e.g. 4
-- batches of a casserole made as written, 1 batch with a gluten-free
-- topping, 1 batch without poppy seeds -- each independently scaled and
-- labeled, together covering the event's headcount for that dish.
CREATE TABLE event_recipe_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  recipe_id INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Standard',
  servings INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (event_id, recipe_id) REFERENCES event_recipes(event_id, recipe_id) ON DELETE CASCADE
);
