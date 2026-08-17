-- Each variant can bake in a different pan than the recipe's native one
-- (e.g. the recipe was written for a 9x9 but you're doing a 9x13 for this
-- event). Null means "use the recipe's own pan" -- no override.
ALTER TABLE event_recipe_variants ADD COLUMN pan_size_json TEXT;
