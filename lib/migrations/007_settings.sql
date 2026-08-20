-- Small key-value store for app-wide settings configured through the UI
-- (e.g. the Anthropic API key), so a non-technical person can paste one
-- in from the Settings page instead of editing .env.local by hand.
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
