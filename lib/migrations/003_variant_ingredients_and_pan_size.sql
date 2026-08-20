-- Each variant now carries its own editable ingredient list (a copy of the
-- recipe's ingredients at creation time) so a variant can actually remove or
-- swap an ingredient, not just carry a note about doing so.
ALTER TABLE event_recipe_variants ADD COLUMN ingredients_json TEXT NOT NULL DEFAULT '[]';

-- A recipe's native pan/dish size, recorded once so every event that reuses
-- the recipe can scale to a different vessel by area ratio instead of
-- re-entering the source pan size each time.
ALTER TABLE recipes ADD COLUMN pan_size_json TEXT;
